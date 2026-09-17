/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { hasSameEsql } from '@kbn/streams-schema';
import {
  getNightshiftSourceViewName,
  type ListSourcesResponse,
  type NightshiftSource,
  type SourceHealth,
  type SourceInput,
  type SourceWithHealth,
} from '@kbn/nightshift-shared';
import { notFound } from '@hapi/boom';
import pLimit from 'p-limit';
import { v4 as uuidv4 } from 'uuid';
import {
  NIGHTSHIFT_SOURCE_SO_TYPE,
  type NightshiftSourceAttributes,
} from '../saved_objects/nightshift_source_saved_object';
import { assertSourceQueryExecutes, hasNoIndicesBehind } from './assert_source_query_executes';
import { isEsqlUnknownIndexError, isEsqlVerificationError } from './es_errors';
import type { EsqlViewsClient } from './esql_views_client';
import { validateSourceQuery } from './validate_source_query';

const HEALTH_CHECK_CONCURRENCY = 10;

// Every write sends the full attribute set, so a field the caller dropped (an optional
// `description`) must be removed rather than merged over the stored value.
const FULL_UPDATE = { mergeAttributes: false } as const;

export type SourceViewsClient = Pick<EsqlViewsClient, 'putView' | 'getView' | 'deleteView'>;

interface SourcesClientDependencies {
  soClient: SavedObjectsClientContract;
  viewsClient: SourceViewsClient;
  dataEsClient: ElasticsearchClient;
  logger: Logger;
  username: string;
}

const toSource = (id: string, attributes: NightshiftSourceAttributes): NightshiftSource => ({
  id,
  ...attributes,
});

export class SourcesClient {
  constructor(private readonly deps: SourcesClientDependencies) {}

  async create(input: SourceInput): Promise<NightshiftSource> {
    const { soClient, viewsClient, username } = this.deps;
    validateSourceQuery(input.esql);
    await assertSourceQueryExecutes({ esClient: this.deps.dataEsClient, esql: input.esql });

    const id = uuidv4();
    const now = new Date().toISOString();
    const attributes: NightshiftSourceAttributes = {
      ...input,
      view_name: getNightshiftSourceViewName(id),
      enabled: true,
      created_by: username,
      created_at: now,
      updated_at: now,
      esql_updated_at: now,
    };

    await soClient.create<NightshiftSourceAttributes>(NIGHTSHIFT_SOURCE_SO_TYPE, attributes, {
      id,
    });

    try {
      await viewsClient.putView(attributes.view_name, attributes.esql);
    } catch (error) {
      await this.compensate(`roll back source ${id} after its view could not be created`, () =>
        soClient.delete(NIGHTSHIFT_SOURCE_SO_TYPE, id)
      );
      throw error;
    }

    return toSource(id, attributes);
  }

  async update(id: string, input: SourceInput): Promise<NightshiftSource> {
    const { soClient, viewsClient } = this.deps;
    const so = await this.getSavedObject(id);
    const { attributes: previous } = so;
    const esqlChanged = !hasSameEsql(input.esql, previous.esql);
    validateSourceQuery(input.esql);
    if (esqlChanged) {
      await assertSourceQueryExecutes({ esClient: this.deps.dataEsClient, esql: input.esql });
    }

    const now = new Date().toISOString();
    // Assign the editable fields one by one: an omitted `description` must clear the stored one,
    // which a spread of `input` would leave in place.
    const attributes: NightshiftSourceAttributes = {
      ...previous,
      title: input.title,
      description: input.description,
      tags: input.tags,
      esql: input.esql,
      updated_at: now,
      esql_updated_at: esqlChanged ? now : previous.esql_updated_at,
    };

    const updated = await soClient.update(NIGHTSHIFT_SOURCE_SO_TYPE, id, attributes, {
      ...FULL_UPDATE,
      version: so.version,
    });

    try {
      await viewsClient.putView(attributes.view_name, attributes.esql);
    } catch (error) {
      await this.compensate(`restore source ${id} after its view could not be updated`, () =>
        soClient.update(NIGHTSHIFT_SOURCE_SO_TYPE, id, previous, {
          ...FULL_UPDATE,
          version: updated.version,
        })
      );
      throw error;
    }

    return toSource(id, attributes);
  }

  async get(id: string): Promise<SourceWithHealth> {
    const { attributes } = await this.getSavedObject(id);
    const source = toSource(id, attributes);
    return { source, health: await this.getHealth(source, { checkResolvable: true }) };
  }

  async list({
    page,
    perPage,
    search,
    enabled,
  }: {
    page: number;
    perPage: number;
    search?: string;
    enabled?: boolean;
  }): Promise<ListSourcesResponse> {
    const filters: string[] = [];
    if (search) {
      filters.push(`${NIGHTSHIFT_SOURCE_SO_TYPE}.attributes.title: ${search}*`);
    }
    if (enabled !== undefined) {
      filters.push(`${NIGHTSHIFT_SOURCE_SO_TYPE}.attributes.enabled: ${enabled}`);
    }

    const response = await this.deps.soClient.find<NightshiftSourceAttributes>({
      type: NIGHTSHIFT_SOURCE_SO_TYPE,
      page,
      perPage,
      sortField: 'title',
      sortOrder: 'asc',
      filter: filters.length > 0 ? filters.join(' AND ') : undefined,
    });

    const limit = pLimit(HEALTH_CHECK_CONCURRENCY);
    const sources = await Promise.all(
      response.saved_objects.map((savedObject) =>
        limit(async (): Promise<SourceWithHealth> => {
          const source = toSource(savedObject.id, savedObject.attributes);
          return { source, health: await this.getHealth(source, { checkResolvable: false }) };
        })
      )
    );

    return { sources, total: response.total, page, per_page: perPage };
  }

  async delete(id: string): Promise<void> {
    const { soClient, viewsClient } = this.deps;
    const { attributes } = await this.getSavedObject(id);
    // SO first: an orphaned view is invisible to Kibana and harmless, while a source
    // with view_missing health is visible and looks broken.
    await soClient.delete(NIGHTSHIFT_SOURCE_SO_TYPE, id);
    await this.compensate(`clean up view for deleted source ${id}`, () =>
      viewsClient.deleteView(attributes.view_name)
    );
  }

  /** Flips the flag only; engines reconcile their rules and onboarding from it. */
  async setEnabled(id: string, enabled: boolean): Promise<NightshiftSource> {
    const so = await this.getSavedObject(id);
    if (so.attributes.enabled === enabled) {
      return toSource(id, so.attributes);
    }
    const attributes: NightshiftSourceAttributes = {
      ...so.attributes,
      enabled,
      updated_at: new Date().toISOString(),
    };
    await this.deps.soClient.update(NIGHTSHIFT_SOURCE_SO_TYPE, id, attributes, {
      ...FULL_UPDATE,
      version: so.version,
    });
    return toSource(id, attributes);
  }

  /**
   * `unknown` wins over everything because it means we could not look (privileges, ES down), so
   * no other verdict is trustworthy. `unresolvable` is reserved for a query ES refuses to plan.
   */
  async getHealth(
    source: NightshiftSource,
    { checkResolvable }: { checkResolvable: boolean }
  ): Promise<SourceHealth> {
    const { viewsClient, dataEsClient, logger } = this.deps;

    let view;
    try {
      view = await viewsClient.getView(source.view_name);
    } catch (error) {
      logger.info(`Could not read view ${source.view_name} for source ${source.id}: ${error}`);
      return 'unknown';
    }
    if (!view) {
      return 'view_missing';
    }
    if (typeof view.query !== 'string') {
      return 'view_drift';
    }
    // Byte-equal skips the parse-and-normalize on every list row.
    if (view.query !== source.esql && !hasSameEsql(view.query, source.esql)) {
      return 'view_drift';
    }
    if (!checkResolvable) {
      return 'ok';
    }

    try {
      await dataEsClient.esql.query({
        query: `FROM ${source.view_name} | LIMIT 0`,
        format: 'json',
      });
      return 'ok';
    } catch (error) {
      // The view exists and its query matches, but the underlying index doesn't exist yet.
      // That's the normal "no data yet" state, not a broken source.
      if (isEsqlUnknownIndexError(error)) {
        return 'ok';
      }
      if (!isEsqlVerificationError(error)) {
        logger.info(`Could not probe view ${source.view_name} for source ${source.id}: ${error}`);
        return 'unknown';
      }
    }

    // A view over indices that do not exist yet cannot resolve its WHERE fields either; that is
    // the accepted "no data yet" state, not a broken query.
    try {
      const noIndices = await hasNoIndicesBehind({ esClient: dataEsClient, esql: source.esql });
      return noIndices ? 'ok' : 'unresolvable';
    } catch (error) {
      logger.info(`Could not probe sources of ${source.id}: ${error}`);
      return 'unknown';
    }
  }

  private async getSavedObject(id: string) {
    try {
      return await this.deps.soClient.get<NightshiftSourceAttributes>(
        NIGHTSHIFT_SOURCE_SO_TYPE,
        id
      );
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        throw notFound(`Source ${id} not found`);
      }
      throw error;
    }
  }

  /** Best-effort undo after a view write failed; the original error is what the caller sees. */
  private async compensate(description: string, operation: () => Promise<unknown>): Promise<void> {
    try {
      await operation();
    } catch (error) {
      this.deps.logger.warn(`Failed to ${description}: ${error}`);
    }
  }
}
