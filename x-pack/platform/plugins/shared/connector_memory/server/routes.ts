/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, KibanaRequest } from '@kbn/core/server';
import { apiPrivileges } from '@kbn/context-engine-plugin/common/features';
import { API_BASE_PATH, type SummaryKind } from '../common/constants';
import type { ConnectorListEntry, ConnectorStatus, CrawlScheduleStatus } from '../common/types';
import type { MemoryStore } from './memory';
import { overridesSchema, type ConnectorSettings } from './settings';
import { contentSourceOf } from './sources';
import type { Services } from './types';
import type { CrawlWorkflows } from './workflow';

const readSecurity = { authz: { requiredPrivileges: [apiPrivileges.readContextEngine] } };
const writeSecurity = { authz: { requiredPrivileges: [apiPrivileges.writeContextEngine] } };
const params = schema.object({ connectorId: schema.string({ minLength: 1, maxLength: 255 }) });

export const MIN_INTERVAL_MINUTES = 15;

const crawlSchema = schema.object({
  folder: schema.maybe(schema.string({ maxLength: 2048 })),
  maxDepth: schema.number({ min: 0, max: 10, defaultValue: 1 }),
  maxFiles: schema.number({ min: 1, max: 5000, defaultValue: 100 }),
  mode: schema.oneOf([schema.literal('names'), schema.literal('full')], { defaultValue: 'names' }),
  inferenceConnectorId: schema.maybe(schema.string({ minLength: 1, maxLength: 255 })),
  intervalMinutes: schema.number({ min: MIN_INTERVAL_MINUTES, max: 10080, defaultValue: 1440 }),
});

/** An overrides body, plus the connector's crawl: an object sets it, `null` removes it, absent leaves it. */
const putBody = overridesSchema.extends({ crawl: schema.maybe(schema.nullable(crawlSchema)) });

interface Counts {
  visibleToYou: number;
  total: number;
  byKind: Partial<Record<SummaryKind, number>>;
  newestAt: string | null;
}

/** Cached documents per connector (all, and those the caller can see), in one query. */
const countDocuments = async (
  services: Services,
  store: MemoryStore,
  request: KibanaRequest
): Promise<Map<string, Counts>> => {
  const counts = new Map<string, Counts>();
  const target = await store.target(services.getSpaceId(request));
  if (target === undefined) {
    return counts;
  }
  const profile = (await services.getProfileUid(request)) ?? '';
  const { columns, values } = await services.runQuery({
    request,
    limit: 500,
    params: { profile },
    esql: [
      `FROM ${target}`,
      '| WHERE type == "document"',
      '| EVAL connector_id = FIELD_EXTRACT(attributes, "connector_id")',
      '| EVAL kind = FIELD_EXTRACT(attributes, "summary_kind")',
      '| EVAL visible_to = FIELD_EXTRACT(attributes, "visible_to")',
      '| EVAL yours = visible_to IS NULL OR MV_CONTAINS(visible_to, ?profile)',
      '| STATS n = COUNT(*), newest = MAX(updated_at) BY connector_id, kind, yours',
    ].join('\n'),
  });
  const at = (name: string) => columns.findIndex((column) => column.name === name);
  for (const row of values) {
    const id = String(row[at('connector_id')]);
    const entry = counts.get(id) ?? { visibleToYou: 0, total: 0, byKind: {}, newestAt: null };
    const n = Number(row[at('n')]);
    const kind = String(row[at('kind')]) as SummaryKind;
    const newest = row[at('newest')];
    entry.total += n;
    entry.byKind[kind] = (entry.byKind[kind] ?? 0) + n;
    entry.visibleToYou += row[at('yours')] === true ? n : 0;
    if (typeof newest === 'string' && (entry.newestAt === null || newest > entry.newestAt)) {
      entry.newestAt = newest;
    }
    counts.set(id, entry);
  }
  return counts;
};

export const createRoutes = ({
  router,
  services,
  store,
  settings,
  workflows,
  syncSources,
}: {
  router: IRouter;
  services: Services;
  store: MemoryStore;
  settings: ConnectorSettings;
  /** Absent: scheduled crawls are not available. */
  workflows?: CrawlWorkflows;
  /** Lists the connectors that support Context Engine as sources of the memory index. */
  syncSources?: (spaceId: string) => Promise<void>;
}): void => {
  const noCrawl = { total: 0, visibleToYou: 0, byKind: {}, newestAt: null } as Counts;
  const readSchedule = (
    request: KibanaRequest,
    spaceId: string,
    connectorId: string
  ): Promise<CrawlScheduleStatus | null> =>
    workflows
      ? workflows.read({ request, spaceId, connectorId }).then(
          (s) => s ?? null,
          () => null
        )
      : Promise.resolve(null);

  /** The space and connector a request is about, or why it cannot be served. */
  const resolve = async (
    request: KibanaRequest<{ connectorId: string }>
  ): Promise<
    | { problem: string }
    | {
        problem?: undefined;
        spaceId: string;
        connectorId: string;
        connector: Awaited<ReturnType<Services['getConnector']>>;
      }
  > => {
    const spaceId = services.getSpaceId(request);
    if (!(await services.isContextEngineEnabled(spaceId))) {
      return { problem: 'Context Engine is disabled in this space.' };
    }
    const { connectorId } = request.params;
    const connector = await services.getConnector(request, connectorId).catch(() => undefined);
    return connector
      ? { spaceId, connectorId, connector }
      : { problem: `Connector '${connectorId}' was not found.` };
  };

  router.get(
    {
      path: `${API_BASE_PATH}/connectors`,
      security: readSecurity,
      options: { access: 'internal' },
      validate: false,
    },
    async (_context, request, response) => {
      const spaceId = services.getSpaceId(request);
      if (!(await services.isContextEngineEnabled(spaceId))) {
        return response.notFound({
          body: { message: 'Context Engine is disabled in this space.' },
        });
      }
      void syncSources?.(spaceId)?.catch(() => undefined);
      const [connectors, counts] = await Promise.all([
        services.listConnectors(request),
        countDocuments(services, store, request),
      ]);
      const entries: ConnectorListEntry[] = await Promise.all(
        connectors
          .filter(({ actionTypeId }) => contentSourceOf(actionTypeId) !== undefined)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(async ({ id, name, actionTypeId, authMode }) => {
            const { effective, customized } = await settings.describe({
              esClient: services.esClient(request),
              spaceId,
              connectorId: id,
            });
            return {
              connectorId: id,
              name,
              connectorType: actionTypeId,
              permissionScope: authMode === 'per-user' ? 'per_user' : 'connector',
              settings: effective,
              customized,
              documents: counts.get(id)?.total ?? 0,
              schedule: await readSchedule(request, spaceId, id),
            };
          })
      );
      return response.ok({ body: { connectors: entries } });
    }
  );

  router.get(
    {
      path: `${API_BASE_PATH}/status/{connectorId}`,
      security: readSecurity,
      options: { access: 'internal' },
      validate: { params },
    },
    async (_context, request, response) => {
      const target = await resolve(request);
      if (target.problem !== undefined) {
        return response.notFound({ body: { message: target.problem } });
      }
      const { spaceId, connectorId, connector } = target;
      const [counts, described, schedule] = await Promise.all([
        countDocuments(services, store, request),
        settings.describe({ esClient: services.esClient(request), spaceId, connectorId }),
        readSchedule(request, spaceId, connectorId),
      ]);
      const { visibleToYou, total, byKind, newestAt } = counts.get(connectorId) ?? noCrawl;
      const contentSource = contentSourceOf(connector.actionTypeId);
      const body: ConnectorStatus = {
        connectorId,
        connectorType: connector.actionTypeId,
        permissionScope: connector.authMode === 'per-user' ? 'per_user' : 'connector',
        settings: described,
        documents: { visibleToYou, total, byKind },
        newestAt,
        crawlEnabled: workflows !== undefined && contentSource !== undefined,
        ...(contentSource && {
          contentSource: {
            example: contentSource.example,
            required: contentSource.required === true,
          },
        }),
        schedule,
      };
      return response.ok({ body });
    }
  );

  router.put(
    {
      path: `${API_BASE_PATH}/settings/{connectorId}`,
      security: writeSecurity,
      options: { access: 'internal' },
      validate: { params, body: putBody },
    },
    async (_context, request, response) => {
      const target = await resolve(request);
      if (target.problem !== undefined) {
        return response.notFound({ body: { message: target.problem } });
      }
      const { spaceId, connectorId, connector } = target;
      const { crawl, ...overrides } = request.body;
      // Everything is checked before anything is saved, so a refused crawl leaves the settings as they were.
      if (crawl !== undefined && workflows === undefined) {
        return response.badRequest({
          body: {
            message: 'Scheduled crawls are not available: the workflows plugin is not running.',
          },
        });
      }
      const contentSource = contentSourceOf(connector.actionTypeId);
      if (crawl && contentSource === undefined) {
        return response.badRequest({
          body: { message: `Connector type '${connector.actionTypeId}' cannot be crawled.` },
        });
      }
      if (crawl && contentSource?.required && !crawl.folder) {
        return response.badRequest({
          body: {
            message: `This connector needs a starting location, like '${contentSource.example}'.`,
          },
        });
      }
      await settings.save(
        { esClient: services.esClient(request), spaceId, connectorId },
        overrides
      );
      if (workflows && crawl === null) {
        await workflows.remove({ request, spaceId, connectorId });
      } else if (workflows && crawl) {
        await workflows.save({ request, spaceId, connectorId, crawl });
      }
      return response.ok({ body: { connectorId } });
    }
  );

  router.delete(
    {
      path: `${API_BASE_PATH}/settings/{connectorId}`,
      security: writeSecurity,
      options: { access: 'internal' },
      validate: { params },
    },
    async (_context, request, response) => {
      const target = await resolve(request);
      if (target.problem !== undefined) {
        return response.notFound({ body: { message: target.problem } });
      }
      await settings.reset({
        esClient: services.esClient(request),
        spaceId: target.spaceId,
        connectorId: target.connectorId,
      });
      // Back to the defaults means no scheduled crawl either.
      await workflows?.remove({
        request,
        spaceId: target.spaceId,
        connectorId: target.connectorId,
      });
      return response.ok({ body: { connectorId: target.connectorId } });
    }
  );

  if (workflows) {
    router.post(
      {
        path: `${API_BASE_PATH}/crawl/{connectorId}/_run`,
        security: writeSecurity,
        options: { access: 'internal' },
        validate: { params },
      },
      async (_context, request, response) => {
        const spaceId = services.getSpaceId(request);
        const { connectorId } = request.params;
        const started = await workflows
          .runNow({ request, spaceId, connectorId })
          .catch((error: Error) => error);
        if (started instanceof Error) {
          return response.badRequest({
            body: { message: `The crawl could not be run now: ${started.message}` },
          });
        }
        return started
          ? response.ok({ body: { connectorId } })
          : response.notFound({ body: { message: 'This connector has no scheduled crawl.' } });
      }
    );
  }
};
