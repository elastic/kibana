/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  Logger,
  SavedObject,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { normalizeEsqlSafe } from '@kbn/streams-schema';
import {
  getNightshiftSourceViewName,
  type CreateSourceRequest,
  type ListSourcesResponse,
  type NightshiftSource,
  type SourceHealth,
  type SourceWithHealth,
  type UpdateSourceRequest,
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

export type SourceSavedObjectsClient = Pick<
  SavedObjectsClientContract,
  'create' | 'get' | 'update' | 'delete' | 'find'
>;

export interface SourcesClientDependencies {
  soClient: SourceSavedObjectsClient;
  viewsClient: EsqlViewsClient;
  /** Client used to run ES|QL against the data behind a source (validation and health probes). */
  dataEsClient: ElasticsearchClient;
  logger: Logger;
  username: string;
}

export interface ListSourcesParams {
  page: number;
  perPage: number;
  enabled?: boolean;
}

type SourceInput = CreateSourceRequest | UpdateSourceRequest;

const toSource = (savedObject: SavedObject<NightshiftSourceAttributes>): NightshiftSource => ({
  id: savedObject.id,
  ...savedObject.attributes,
});

const sourceNotFound = (id: string): Error => notFound(`Source ${id} not found`);

/**
 * Space-scoped CRUD for Nightshift sources plus the ES|QL view that materialises each one.
 * Depends only on clients handed in at construction so it can move to a package later.
 */
export class SourcesClient {
  constructor(private readonly deps: SourcesClientDependencies) {}

  async create(input: SourceInput): Promise<NightshiftSource> {
    const { soClient, viewsClient, username } = this.deps;
    await this.validate(input.esql);

    const id = uuidv4();
    const now = new Date().toISOString();
    const attributes: NightshiftSourceAttributes = {
      title: input.title,
      description: input.description,
      tags: input.tags ?? [],
      esql: input.esql,
      view_name: getNightshiftSourceViewName(id),
      enabled: true,
      created_by: username,
      created_at: now,
      updated_at: now,
      esql_updated_at: now,
    };

    const savedObject = await soClient.create<NightshiftSourceAttributes>(
      NIGHTSHIFT_SOURCE_SO_TYPE,
      attributes,
      { id }
    );

    try {
      await viewsClient.putView(attributes.view_name, attributes.esql);
    } catch (error) {
      await this.rollbackCreate(id);
      throw error;
    }

    return toSource(savedObject);
  }

  /** Full replacement of the editable fields; the view is always re-put so a `PUT` doubles as repair. */
  async update(id: string, input: SourceInput): Promise<NightshiftSource> {
    const { soClient, viewsClient } = this.deps;
    const existing = await this.getSavedObject(id);
    await this.validate(input.esql);

    const now = new Date().toISOString();
    const esqlChanged =
      normalizeEsqlSafe(input.esql) !== normalizeEsqlSafe(existing.attributes.esql);
    const attributes: NightshiftSourceAttributes = {
      ...existing.attributes,
      title: input.title,
      description: input.description,
      tags: input.tags ?? [],
      esql: input.esql,
      updated_at: now,
      esql_updated_at: esqlChanged ? now : existing.attributes.esql_updated_at,
    };

    await soClient.update<NightshiftSourceAttributes>(NIGHTSHIFT_SOURCE_SO_TYPE, id, attributes);

    try {
      await viewsClient.putView(attributes.view_name, attributes.esql);
    } catch (error) {
      await this.restoreAttributes(id, existing.attributes);
      throw error;
    }

    return { id, ...attributes };
  }

  async get(id: string): Promise<SourceWithHealth> {
    const source = toSource(await this.getSavedObject(id));
    const health = await this.getHealth(source, { checkResolvable: true });
    return { source, health };
  }

  async list({ page, perPage, enabled }: ListSourcesParams): Promise<ListSourcesResponse> {
    const { soClient } = this.deps;
    const response = await soClient.find<NightshiftSourceAttributes>({
      type: NIGHTSHIFT_SOURCE_SO_TYPE,
      page,
      perPage,
      sortField: 'title',
      sortOrder: 'asc',
      filter:
        enabled === undefined
          ? undefined
          : `${NIGHTSHIFT_SOURCE_SO_TYPE}.attributes.enabled: ${enabled}`,
    });

    const limit = pLimit(HEALTH_CHECK_CONCURRENCY);
    const sources = await Promise.all(
      response.saved_objects.map((savedObject) =>
        limit(async (): Promise<SourceWithHealth> => {
          const source = toSource(savedObject);
          return { source, health: await this.getHealth(source, { checkResolvable: false }) };
        })
      )
    );

    return { sources, total: response.total, page, per_page: perPage };
  }

  async delete(id: string): Promise<void> {
    const { soClient, viewsClient } = this.deps;
    const existing = await this.getSavedObject(id);
    await viewsClient.deleteView(existing.attributes.view_name);
    await soClient.delete(NIGHTSHIFT_SOURCE_SO_TYPE, id);
  }

  /** Flips the flag only; engines reconcile their rules and onboarding from it. */
  async setEnabled(id: string, enabled: boolean): Promise<NightshiftSource> {
    const { soClient } = this.deps;
    const existing = await this.getSavedObject(id);
    const attributes: NightshiftSourceAttributes = {
      ...existing.attributes,
      enabled,
      updated_at: new Date().toISOString(),
    };
    await soClient.update<NightshiftSourceAttributes>(NIGHTSHIFT_SOURCE_SO_TYPE, id, attributes);
    return { id, ...attributes };
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
      logger.debug(`Could not read view ${source.view_name} for source ${source.id}: ${error}`);
      return 'unknown';
    }
    if (!view) {
      return 'view_missing';
    }
    if (normalizeEsqlSafe(view.query) !== normalizeEsqlSafe(source.esql)) {
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
      if (isEsqlUnknownIndexError(error)) {
        return 'ok';
      }
      if (isEsqlVerificationError(error)) {
        // A view over indices that do not exist yet cannot resolve its WHERE fields either; that
        // is the accepted "no data yet" state, not a broken query.
        const noIndices = await hasNoIndicesBehind({ esClient: dataEsClient, esql: source.esql });
        return noIndices ? 'ok' : 'unresolvable';
      }
      logger.debug(`Could not probe view ${source.view_name} for source ${source.id}: ${error}`);
      return 'unknown';
    }
  }

  private async validate(esql: string): Promise<void> {
    validateSourceQuery(esql);
    await assertSourceQueryExecutes({ esClient: this.deps.dataEsClient, esql });
  }

  private async getSavedObject(id: string): Promise<SavedObject<NightshiftSourceAttributes>> {
    try {
      return await this.deps.soClient.get<NightshiftSourceAttributes>(
        NIGHTSHIFT_SOURCE_SO_TYPE,
        id
      );
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        throw sourceNotFound(id);
      }
      throw error;
    }
  }

  private async rollbackCreate(id: string): Promise<void> {
    try {
      await this.deps.soClient.delete(NIGHTSHIFT_SOURCE_SO_TYPE, id);
    } catch (error) {
      this.deps.logger.warn(
        `Failed to roll back source ${id} after its view could not be created: ${error}`
      );
    }
  }

  private async restoreAttributes(
    id: string,
    attributes: NightshiftSourceAttributes
  ): Promise<void> {
    try {
      await this.deps.soClient.update<NightshiftSourceAttributes>(
        NIGHTSHIFT_SOURCE_SO_TYPE,
        id,
        attributes
      );
    } catch (error) {
      this.deps.logger.warn(
        `Failed to restore source ${id} after its view could not be updated: ${error}`
      );
    }
  }
}
