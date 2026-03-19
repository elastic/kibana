/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { schema } from '@kbn/config-schema';
import type {
  CoreSetup,
  CoreStart,
  IRouter,
  KibanaRequest,
  Logger,
  SavedObjectReference,
} from '@kbn/core/server';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/dashboard-agent-common';
import type { DashboardAttachmentData, AttachmentPanel } from '@kbn/dashboard-agent-common';
import { isLensAttachmentPanel, isGenericAttachmentPanel } from '@kbn/dashboard-agent-common';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder';
import type { ElasticConsolePluginStart, ElasticConsoleStartDependencies } from '../types';
import { createSessionStorage } from '../lib/session_storage';
import { isElasticConsoleEnabled } from './is_enabled';

/**
 * Per-session mutex to serialize tool executions.
 * Prevents parallel tool calls from overwriting each other's attachment state.
 */
const sessionLocks = new Map<string, Promise<unknown>>();

const withSessionLock = async <T>(sessionId: string, fn: () => Promise<T>): Promise<T> => {
  const previous = sessionLocks.get(sessionId) ?? Promise.resolve();
  const current = previous.then(fn, fn);
  sessionLocks.set(sessionId, current);
  try {
    return await current;
  } finally {
    // Clean up if this is still the latest promise in the chain
    if (sessionLocks.get(sessionId) === current) {
      sessionLocks.delete(sessionId);
    }
  }
};

const getSpace = (basePath: string): string => {
  const spaceMatch = basePath.match(/(?:^|\/)s\/([^/]+)/);
  return spaceMatch ? spaceMatch[1] : 'default';
};

const getCurrentUser = async (coreStart: CoreStart, request: KibanaRequest): Promise<string> => {
  const authUser = coreStart.security.authc.getCurrentUser(request);
  if (authUser) {
    return authUser.username;
  }
  const esClient = coreStart.elasticsearch.client.asScoped(request).asCurrentUser;
  const authResponse = await esClient.security.authenticate();
  return authResponse.username;
};

const summarizeAttachments = (attachments: VersionedAttachment[]) => {
  return attachments.map((att) => ({
    id: att.id,
    type: att.type,
    description: att.description,
    active: att.active ?? true,
    current_version: att.current_version,
    origin: att.origin,
  }));
};

/**
 * Singleton LensConfigBuilder used to convert Lens API format to
 * serialized Lens attributes for dashboard saved objects.
 * The `lens.apiFormat` feature flag controls whether the dashboard's
 * embeddable transforms perform this conversion automatically. Since
 * it defaults to `false`, we bypass the transform system and call
 * `fromAPIFormat` directly.
 */
const lensBuilder = new LensConfigBuilder();

/**
 * Prefix references from a panel with the panel ID.
 * Same logic as dashboard's `prefixReferencesFromPanel`.
 */
const prefixReferencesFromPanel = (
  id: string,
  references: SavedObjectReference[]
): SavedObjectReference[] => {
  const prefix = `${id}:`;
  return references
    .filter((reference) => reference.type !== 'tag')
    .map((reference) => ({
      ...reference,
      name: `${prefix}${reference.name}`,
    }));
};

/**
 * Convert an attachment panel to a dashboard saved-object panel entry.
 *
 * - Lens panels: converts the `visualization` (Lens API format) to serialized
 *   Lens attributes via `LensConfigBuilder.fromAPIFormat()`, then extracts
 *   references for data views.
 * - Generic panels (markdown, etc.): passes `rawConfig` through as embeddableConfig.
 */
const convertAttachmentPanelToStoredPanel = (
  panel: AttachmentPanel,
  logger: Logger
): {
  storedPanel: Record<string, unknown>;
  references: SavedObjectReference[];
} => {
  const idx = ('panelId' in panel ? (panel.panelId as string) : undefined) ?? uuidv4();

  if (isLensAttachmentPanel(panel)) {
    try {
      // Convert from Lens API format (type, dataset, metrics, layers)
      // to serialized Lens attributes (visualizationType, state.datasourceStates, etc.)
      const serializedAttributes = lensBuilder.fromAPIFormat(panel.visualization);

      // Extract references from the serialized attributes (data view refs, etc.)
      const lensReferences: SavedObjectReference[] = [];
      const attrs = serializedAttributes as Record<string, unknown>;
      if (Array.isArray(attrs.references)) {
        for (const ref of attrs.references as Array<{
          name: string;
          type: string;
          id: string;
        }>) {
          lensReferences.push(ref);
        }
        // Remove references from attributes — they go at the SO level
        delete attrs.references;
      }

      return {
        storedPanel: {
          type: 'lens',
          panelIndex: idx,
          embeddableConfig: {
            attributes: serializedAttributes,
            ...(panel.title && { title: panel.title }),
          },
          gridData: { ...panel.grid, i: idx },
        },
        references: prefixReferencesFromPanel(idx, lensReferences),
      };
    } catch (err) {
      logger.warn(`Failed to convert Lens panel ${idx}: ${err.message}`);
    }
  }

  if (isGenericAttachmentPanel(panel)) {
    return {
      storedPanel: {
        type: panel.type,
        panelIndex: idx,
        embeddableConfig: {
          ...panel.rawConfig,
          ...(panel.title && { title: panel.title }),
        },
        gridData: { ...panel.grid, i: idx },
      },
      references: [],
    };
  }

  // Fallback — store as-is
  const p = panel as Record<string, unknown>;
  return {
    storedPanel: {
      type: (p.type as string) ?? 'unknown',
      panelIndex: idx,
      embeddableConfig: {},
      gridData: { ...(p.grid as Record<string, unknown>), i: idx },
    },
    references: [],
  };
};

/**
 * Convert attachment panels (and sections) to dashboard saved-object format.
 * Returns `panelsJSON`, `sections`, and extracted `references`.
 */
const serializeAttachmentPanels = (
  panels: AttachmentPanel[],
  sections: Array<{
    sectionId: string;
    title: string;
    collapsed: boolean;
    grid: Record<string, unknown>;
    panels: AttachmentPanel[];
  }>,
  log: Logger
): {
  panelsJSON: string;
  sections: Array<Record<string, unknown>>;
  references: SavedObjectReference[];
} => {
  const storedPanels: Array<Record<string, unknown>> = [];
  const storedSections: Array<Record<string, unknown>> = [];
  const allReferences: SavedObjectReference[] = [];

  for (const panel of panels) {
    const { storedPanel, references } = convertAttachmentPanelToStoredPanel(panel, log);
    storedPanels.push(storedPanel);
    allReferences.push(...references);
  }

  for (const section of sections) {
    const sectionIdx = section.sectionId ?? uuidv4();
    storedSections.push({
      title: section.title,
      collapsed: section.collapsed ?? false,
      gridData: { ...section.grid, i: sectionIdx },
    });
    for (const panel of section.panels) {
      const { storedPanel, references } = convertAttachmentPanelToStoredPanel(panel, log);
      storedPanels.push({
        ...storedPanel,
        gridData: {
          ...(storedPanel.gridData as Record<string, unknown>),
          sectionId: sectionIdx,
        },
      });
      allReferences.push(...references);
    }
  }

  return {
    panelsJSON: JSON.stringify(storedPanels),
    sections: storedSections,
    references: allReferences,
  };
};

export const registerSessionRoutes = ({
  router,
  coreSetup,
  logger,
}: {
  router: IRouter;
  coreSetup: CoreSetup<ElasticConsoleStartDependencies, ElasticConsolePluginStart>;
  logger: Logger;
}) => {
  // Create a new session
  router.post(
    {
      path: '/internal/elastic_console/sessions',
      security: {
        authz: { requiredPrivileges: ['agentBuilder:write'] },
      },
      options: { access: 'internal' },
      validate: {
        body: schema.object({
          skill_id: schema.string(),
        }),
      },
    },
    async (ctx, request, response) => {
      try {
        const [coreStart] = await coreSetup.getStartServices();

        if (!(await isElasticConsoleEnabled(coreStart, request))) {
          return response.notFound();
        }

        const esClient = coreStart.elasticsearch.client.asScoped(request).asInternalUser;
        const storage = createSessionStorage({ esClient, logger });

        const basePath = coreStart.http.basePath.get(request);
        const space = getSpace(basePath);
        const username = await getCurrentUser(coreStart, request);

        const id = uuidv4();
        const now = new Date().toISOString();

        await storage.index({
          id,
          document: {
            skill_id: request.body.skill_id,
            user_name: username,
            space,
            attachments: [],
            created_at: now,
            updated_at: now,
          },
        });

        return response.ok({
          body: { session_id: id },
        });
      } catch (error) {
        logger.error(`Create session error: ${error.message}`);
        return response.customError({
          statusCode: error.statusCode || 500,
          body: { message: error.message },
        });
      }
    }
  );

  // Get session metadata
  router.get(
    {
      path: '/internal/elastic_console/sessions/{sessionId}',
      security: {
        authz: { requiredPrivileges: ['agentBuilder:write'] },
      },
      options: { access: 'internal' },
      validate: {
        params: schema.object({
          sessionId: schema.string(),
        }),
      },
    },
    async (ctx, request, response) => {
      try {
        const [coreStart] = await coreSetup.getStartServices();

        if (!(await isElasticConsoleEnabled(coreStart, request))) {
          return response.notFound();
        }

        const esClient = coreStart.elasticsearch.client.asScoped(request).asInternalUser;
        const storage = createSessionStorage({ esClient, logger });

        const basePath = coreStart.http.basePath.get(request);
        const space = getSpace(basePath);
        const username = await getCurrentUser(coreStart, request);

        const result = await storage.get({ id: request.params.sessionId });

        if (
          !result.found ||
          result._source?.space !== space ||
          result._source?.user_name !== username
        ) {
          return response.notFound();
        }

        const attachments = (result._source?.attachments ?? []) as VersionedAttachment[];

        return response.ok({
          body: {
            session_id: result._id,
            skill_id: result._source?.skill_id,
            created_at: result._source?.created_at,
            updated_at: result._source?.updated_at,
            attachments: summarizeAttachments(attachments),
          },
        });
      } catch (error) {
        logger.error(`Get session error: ${error.message}`);
        return response.customError({
          statusCode: error.statusCode || 500,
          body: { message: error.message },
        });
      }
    }
  );

  // Get session attachments
  router.get(
    {
      path: '/internal/elastic_console/sessions/{sessionId}/attachments',
      security: {
        authz: { requiredPrivileges: ['agentBuilder:write'] },
      },
      options: { access: 'internal' },
      validate: {
        params: schema.object({
          sessionId: schema.string(),
        }),
        query: schema.object({
          active_only: schema.boolean({ defaultValue: true }),
        }),
      },
    },
    async (ctx, request, response) => {
      try {
        const [coreStart] = await coreSetup.getStartServices();

        if (!(await isElasticConsoleEnabled(coreStart, request))) {
          return response.notFound();
        }

        const esClient = coreStart.elasticsearch.client.asScoped(request).asInternalUser;
        const storage = createSessionStorage({ esClient, logger });

        const basePath = coreStart.http.basePath.get(request);
        const space = getSpace(basePath);
        const username = await getCurrentUser(coreStart, request);

        const result = await storage.get({ id: request.params.sessionId });

        if (
          !result.found ||
          result._source?.space !== space ||
          result._source?.user_name !== username
        ) {
          return response.notFound();
        }

        let attachments = (result._source?.attachments ?? []) as VersionedAttachment[];
        if (request.query.active_only) {
          attachments = attachments.filter((att) => att.active !== false);
        }

        return response.ok({
          body: { attachments },
        });
      } catch (error) {
        logger.error(`Get session attachments error: ${error.message}`);
        return response.customError({
          statusCode: error.statusCode || 500,
          body: { message: error.message },
        });
      }
    }
  );

  // Execute a tool within a session context
  router.post(
    {
      path: '/internal/elastic_console/sessions/{sessionId}/tools/_execute',
      security: {
        authz: { requiredPrivileges: ['agentBuilder:write'] },
      },
      options: { access: 'internal' },
      validate: {
        params: schema.object({
          sessionId: schema.string(),
        }),
        body: schema.object({
          skill_id: schema.string(),
          tool_id: schema.string(),
          tool_params: schema.recordOf(schema.string(), schema.any()),
        }),
      },
    },
    async (ctx, request, response) => {
      try {
        const [coreStart, { agentBuilder }] = await coreSetup.getStartServices();

        if (!(await isElasticConsoleEnabled(coreStart, request))) {
          return response.notFound();
        }

        if (!agentBuilder) {
          return response.notFound();
        }

        // Serialize tool executions per session to prevent parallel calls
        // from overwriting each other's attachment state.
        return await withSessionLock(request.params.sessionId, async () => {
          const esClient = coreStart.elasticsearch.client.asScoped(request).asInternalUser;
          const storage = createSessionStorage({ esClient, logger });

          const basePath = coreStart.http.basePath.get(request);
          const space = getSpace(basePath);
          const username = await getCurrentUser(coreStart, request);

          // Load session
          const sessionResult = await storage.get({ id: request.params.sessionId });

          if (
            !sessionResult.found ||
            sessionResult._source?.space !== space ||
            sessionResult._source?.user_name !== username
          ) {
            return response.notFound();
          }

          const sessionAttachments = (sessionResult._source?.attachments ??
            []) as VersionedAttachment[];

          // Execute tool with session attachments
          const result = await agentBuilder.tools.executeSkillToolWithAttachments({
            request,
            skillId: request.body.skill_id,
            toolId: request.body.tool_id,
            toolParams: request.body.tool_params,
            attachments: sessionAttachments,
          });

          // Persist updated attachments back to the session
          await storage.index({
            id: request.params.sessionId,
            document: {
              ...sessionResult._source,
              attachments: result.attachments as unknown[],
              updated_at: new Date().toISOString(),
            },
          });

          return response.ok({
            body: {
              results: result.results,
              attachments: summarizeAttachments(result.attachments),
            },
          });
        });
      } catch (error) {
        logger.error(`Execute session tool error: ${error.message}`);
        if (error.statusCode === 404) {
          return response.notFound({ body: { message: error.message } });
        }
        return response.customError({
          statusCode: error.statusCode || 500,
          body: { message: error.message },
        });
      }
    }
  );

  // Save a dashboard attachment as a real Kibana dashboard saved object
  router.post(
    {
      path: '/internal/elastic_console/sessions/{sessionId}/attachments/{attachmentId}/_save',
      security: {
        authz: { requiredPrivileges: ['agentBuilder:write'] },
      },
      options: { access: 'internal' },
      validate: {
        params: schema.object({
          sessionId: schema.string(),
          attachmentId: schema.string(),
        }),
        body: schema.object({
          title: schema.maybe(schema.string()),
        }),
      },
    },
    async (ctx, request, response) => {
      try {
        const [coreStart] = await coreSetup.getStartServices();

        if (!(await isElasticConsoleEnabled(coreStart, request))) {
          return response.notFound();
        }

        const esClient = coreStart.elasticsearch.client.asScoped(request).asInternalUser;
        const storage = createSessionStorage({ esClient, logger });

        const basePath = coreStart.http.basePath.get(request);
        const space = getSpace(basePath);
        const username = await getCurrentUser(coreStart, request);

        const sessionResult = await storage.get({ id: request.params.sessionId });

        if (
          !sessionResult.found ||
          sessionResult._source?.space !== space ||
          sessionResult._source?.user_name !== username
        ) {
          return response.notFound();
        }

        const attachments = (sessionResult._source?.attachments ?? []) as VersionedAttachment[];
        const attachment = attachments.find((att) => att.id === request.params.attachmentId);

        if (!attachment) {
          return response.notFound({ body: { message: 'Attachment not found' } });
        }

        if (attachment.type !== DASHBOARD_ATTACHMENT_TYPE) {
          return response.badRequest({
            body: { message: `Attachment type '${attachment.type}' is not a dashboard` },
          });
        }

        const latestVersion = getLatestVersion(attachment);
        if (!latestVersion) {
          return response.badRequest({ body: { message: 'Attachment has no versions' } });
        }

        // The attachment data has more runtime fields than the DashboardAttachmentData type
        // declares (options, time_range, query, filters). Cast to access them.
        const dashboardData = latestVersion.data as DashboardAttachmentData &
          Record<string, unknown>;
        const title = request.body.title ?? dashboardData.title;

        // Convert attachment panels to dashboard saved object format.
        // For Lens panels, this calls LensConfigBuilder.fromAPIFormat() to
        // convert from API format (type, dataset, metrics, layers) to serialized
        // Lens attributes (visualizationType, state.datasourceStates, etc.).
        const attachmentSections = (dashboardData.sections ?? []).map((section) => ({
          ...section,
          grid: section.grid as Record<string, unknown>,
        }));

        const {
          panelsJSON,
          sections,
          references: panelReferences,
        } = serializeAttachmentPanels(dashboardData.panels, attachmentSections, logger);

        const options = (dashboardData.options ?? {}) as Record<string, unknown>;
        const optionsJSON = JSON.stringify({
          hidePanelTitles: options.hide_panel_titles ?? false,
          hidePanelBorders: options.hide_panel_borders ?? false,
          useMargins: options.use_margins ?? true,
          syncColors: options.sync_colors ?? false,
          syncCursor: options.sync_cursor ?? true,
          syncTooltips: options.sync_tooltips ?? false,
          autoApplyFilters: options.auto_apply_filters ?? true,
        });

        const timeRange = (dashboardData.time_range as { from: string; to: string }) ?? {
          from: 'now-24h',
          to: 'now',
        };
        const query = (dashboardData.query as Record<string, unknown>) ?? {
          query: '',
          language: 'kuery',
        };
        const filters = (dashboardData.filters as unknown[]) ?? [];

        const dashboardAttributes: Record<string, unknown> = {
          title,
          description: dashboardData.description ?? '',
          panelsJSON,
          ...(sections.length > 0 && { sections }),
          optionsJSON,
          timeRestore: true,
          timeFrom: timeRange.from,
          timeTo: timeRange.to,
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({ query, filter: filters }),
          },
        };

        const soClient = coreStart.savedObjects.getScopedClient(request);

        const savedObject = dashboardData.savedObjectId
          ? await soClient.update('dashboard', dashboardData.savedObjectId, dashboardAttributes, {
              references: panelReferences,
            })
          : await soClient.create('dashboard', dashboardAttributes, {
              references: panelReferences,
            });

        const dashboardId = savedObject.id;

        // Update the attachment origin to point to the saved dashboard
        const updatedAttachments = attachments.map((att) => {
          if (att.id === request.params.attachmentId) {
            return { ...att, origin: dashboardId };
          }
          return att;
        });

        await storage.index({
          id: request.params.sessionId,
          document: {
            ...sessionResult._source,
            attachments: updatedAttachments as unknown[],
            updated_at: new Date().toISOString(),
          },
        });

        const spacePrefix = space !== 'default' ? `/s/${space}` : '';
        const publicBaseUrl = coreStart.http.basePath.publicBaseUrl ?? '';
        const dashboardUrl = `${publicBaseUrl}${spacePrefix}/app/dashboards#/view/${dashboardId}`;
        return response.ok({
          body: {
            dashboard_id: dashboardId,
            url: dashboardUrl,
          },
        });
      } catch (error) {
        logger.error(`Save dashboard attachment error: ${error.message}`);
        return response.customError({
          statusCode: error.statusCode || 500,
          body: { message: error.message },
        });
      }
    }
  );

  // Delete a session
  router.delete(
    {
      path: '/internal/elastic_console/sessions/{sessionId}',
      security: {
        authz: { requiredPrivileges: ['agentBuilder:write'] },
      },
      options: { access: 'internal' },
      validate: {
        params: schema.object({
          sessionId: schema.string(),
        }),
      },
    },
    async (ctx, request, response) => {
      try {
        const [coreStart] = await coreSetup.getStartServices();

        if (!(await isElasticConsoleEnabled(coreStart, request))) {
          return response.notFound();
        }

        const esClient = coreStart.elasticsearch.client.asScoped(request).asInternalUser;
        const storage = createSessionStorage({ esClient, logger });

        const basePath = coreStart.http.basePath.get(request);
        const space = getSpace(basePath);
        const username = await getCurrentUser(coreStart, request);

        // Verify ownership before deleting
        const result = await storage.get({ id: request.params.sessionId });

        if (
          !result.found ||
          result._source?.space !== space ||
          result._source?.user_name !== username
        ) {
          return response.notFound();
        }

        await storage.delete({ id: request.params.sessionId });

        return response.ok({
          body: { deleted: true },
        });
      } catch (error) {
        logger.error(`Delete session error: ${error.message}`);
        return response.customError({
          statusCode: error.statusCode || 500,
          body: { message: error.message },
        });
      }
    }
  );
};
