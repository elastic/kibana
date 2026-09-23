/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { escapeKuery } from '@kbn/es-query';
import { hasSameEsql } from '@kbn/streams-schema';
import {
  createSourceRequestSchema,
  getNightshiftSourceViewName,
  getSourceSlugCandidate,
  hasMultipleSourceIndices,
  updateSourceRequestSchema,
  type CreateSourceRequest,
  type ListSourcesResponse,
  type NightshiftSource,
  type SourceHealth,
  type SourceWithHealth,
  type UpdateSourceRequest,
} from '@kbn/nightshift-shared';
import { z } from '@kbn/zod/v4';
import { badRequest, notFound } from '@hapi/boom';
import { v4 as uuidv4 } from 'uuid';
import {
  NIGHTSHIFT_SOURCE_SO_TYPE,
  type NightshiftSourceAttributes,
} from '../saved_objects/nightshift_source_saved_object';
import { assertSourceQueryExecutes, hasNoIndicesBehind } from './assert_source_query_executes';
import { isEsqlUnknownIndexError, isEsqlVerificationError } from './es_errors';
import type { EsqlViewsClient } from './esql_views_client';
import { validateSourceQuery } from './validate_source_query';

// Every write sends the full attribute set, so a field the caller dropped (an optional
// `description`) must be removed rather than merged over the stored value.
const FULL_UPDATE = { mergeAttributes: false } as const;

export type SourceViewsClient = Pick<EsqlViewsClient, 'putView' | 'getView' | 'deleteView'>;

const MAX_SLUG_ALLOCATION_ATTEMPTS = 100;
const VIEW_NAME_CATALOG_PAGE_SIZE = 1000;

interface SourcesClientDependencies {
  soClient: SavedObjectsClientContract;
  viewsClient: SourceViewsClient;
  dataEsClient: ElasticsearchClient;
  logger: Logger;
  username: string;
  /** Request space; encoded in the view name so grants can be `$.nightshift.sources.<spaceId>.*`. */
  spaceId: string;
}

const toSource = (id: string, attributes: NightshiftSourceAttributes): NightshiftSource => ({
  id,
  ...attributes,
});

// HTTP Zod never runs for `getSourcesClient()`. Parse here so engines cannot persist a blank
// title (or other wire-invalid attributes) that PUT repair would then refuse.
const parseSourceWrite = <T>(schema: z.ZodType<T>, input: unknown): T => {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw badRequest(z.prettifyError(parsed.error));
  }
  return parsed.data;
};

/** Engines treat this as a cursor: it must move forward when the query changes. */
const nextEsqlUpdatedAt = (previous: string, now: string): string => {
  if (now > previous) {
    return now;
  }
  const previousMs = Date.parse(previous);
  if (Number.isNaN(previousMs)) {
    return now;
  }
  return new Date(previousMs + 1).toISOString();
};

export class SourcesClient {
  constructor(private readonly deps: SourcesClientDependencies) {}

  async create(input: CreateSourceRequest): Promise<NightshiftSource> {
    const { soClient, viewsClient, username } = this.deps;
    const parsed = parseSourceWrite(createSourceRequestSchema, input);
    validateSourceQuery(parsed.esql);
    await assertSourceQueryExecutes({ esClient: this.deps.dataEsClient, esql: parsed.esql });

    const slug = await this.allocateSlug(parsed.title);
    const id = uuidv4();
    const now = new Date().toISOString();
    const attributes: NightshiftSourceAttributes = {
      ...parsed,
      slug,
      view_name: getNightshiftSourceViewName(this.deps.spaceId, slug),
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
      // putView can time out after ES committed the view. Delete that first so we do not
      // drop the only catalog handle on an orphan. If the view delete fails, leave the SO.
      await this.compensate(
        `roll back source ${id} after its view could not be created`,
        async () => {
          await viewsClient.deleteView(attributes.view_name);
          await soClient.delete(NIGHTSHIFT_SOURCE_SO_TYPE, id);
        }
      );
      throw error;
    }

    return toSource(id, attributes);
  }

  async update(id: string, input: UpdateSourceRequest): Promise<NightshiftSource> {
    const { soClient, viewsClient } = this.deps;
    const parsed = parseSourceWrite(updateSourceRequestSchema, input);
    const so = await this.getSavedObject(id);
    const { attributes: previous } = so;
    const esqlChanged = !hasSameEsql(parsed.esql, previous.esql);
    validateSourceQuery(parsed.esql);
    if (esqlChanged) {
      await assertSourceQueryExecutes({ esClient: this.deps.dataEsClient, esql: parsed.esql });
    }

    const now = new Date().toISOString();
    // Assign the editable fields one by one: an omitted `description` must clear the stored one,
    // which a spread of `input` would leave in place.
    const attributes: NightshiftSourceAttributes = {
      ...previous,
      title: parsed.title,
      description: parsed.description,
      tags: parsed.tags,
      esql: parsed.esql,
      updated_at: now,
      esql_updated_at: esqlChanged
        ? nextEsqlUpdatedAt(previous.esql_updated_at, now)
        : previous.esql_updated_at,
    };

    const updated = await soClient.update(NIGHTSHIFT_SOURCE_SO_TYPE, id, attributes, {
      ...FULL_UPDATE,
      version: so.version,
    });

    try {
      await viewsClient.putView(attributes.view_name, attributes.esql);
    } catch (error) {
      if (typeof updated.version === 'string') {
        await this.compensate(`restore source ${id} after its view could not be updated`, () =>
          soClient.update(NIGHTSHIFT_SOURCE_SO_TYPE, id, previous, {
            ...FULL_UPDATE,
            version: updated.version,
          })
        );
      } else {
        // No OCC token: an unversioned restore could overwrite a newer PUT.
        this.deps.logger.warn(
          `Skipped restoring source ${id} after its view could not be updated: update response had no version`
        );
      }
      throw error;
    }

    return toSource(id, attributes);
  }

  async get(id: string): Promise<SourceWithHealth> {
    const { attributes } = await this.getSavedObject(id);
    const source = toSource(id, attributes);
    return { source, health: await this.getHealth(source) };
  }

  /** Saved-object catalog. View health is `get()`; list does not fetch views. */
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
      filters.push(`${NIGHTSHIFT_SOURCE_SO_TYPE}.attributes.title: ${escapeKuery(search)}*`);
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

    return {
      sources: response.saved_objects.map((savedObject) =>
        toSource(savedObject.id, savedObject.attributes)
      ),
      total: response.total,
      page,
      per_page: perPage,
    };
  }

  async delete(id: string): Promise<void> {
    const { soClient, viewsClient } = this.deps;
    const { attributes } = await this.getSavedObject(id);
    // View first so a failed ES delete leaves the catalog row and DELETE stays retryable.
    // `deleteView` already ignores 404; anything else must not acknowledge the source as gone.
    await viewsClient.deleteView(attributes.view_name);
    await soClient.delete(NIGHTSHIFT_SOURCE_SO_TYPE, id);
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
  async getHealth(source: NightshiftSource): Promise<SourceHealth> {
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
    // Byte-equal skips the parse-and-normalize.
    if (view.query !== source.esql && !hasSameEsql(view.query, source.esql)) {
      return 'view_drift';
    }

    try {
      await dataEsClient.esql.query({
        query: `FROM ${source.view_name} | LIMIT 0`,
        format: 'json',
      });
      return 'ok';
    } catch (error) {
      // A single missing concrete index is the "no data yet" state. Several sources with
      // one missing name still have data behind the others, so fall through to unresolvable.
      if (isEsqlUnknownIndexError(error) && !hasMultipleSourceIndices(source.esql)) {
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

  /**
   * Slug is immutable after create. Walk `title-slug`, `title-slug-2`, … until neither a
   * live/orphaned view nor a catalog row in this space already uses that name.
   * Catalog names are loaded once; suffixes are checked in memory so we do not re-find
   * the same space for every attempt.
   */
  private async allocateSlug(title: string): Promise<string> {
    const takenViewNames = await this.listViewNamesInSpace();
    for (let attempt = 1; attempt <= MAX_SLUG_ALLOCATION_ATTEMPTS; attempt++) {
      const slug = getSourceSlugCandidate(title, attempt);
      const viewName = getNightshiftSourceViewName(this.deps.spaceId, slug);
      if (takenViewNames.has(viewName)) {
        continue;
      }
      if (await this.deps.viewsClient.getView(viewName)) {
        continue;
      }
      return slug;
    }
    throw badRequest('Could not allocate a unique source view name');
  }

  /** Pages the current space's `view_name` values. Sequential finds: each page depends on the last. */
  private async listViewNamesInSpace(): Promise<Set<string>> {
    const names = new Set<string>();
    let page = 1;
    while (true) {
      const { saved_objects: savedObjects, total } = await this.deps.soClient.find<{
        view_name: string;
      }>({
        type: NIGHTSHIFT_SOURCE_SO_TYPE,
        page,
        perPage: VIEW_NAME_CATALOG_PAGE_SIZE,
        fields: ['view_name'],
      });
      for (const { attributes } of savedObjects) {
        names.add(attributes.view_name);
      }
      if (
        savedObjects.length === 0 ||
        names.size >= total ||
        savedObjects.length < VIEW_NAME_CATALOG_PAGE_SIZE
      ) {
        return names;
      }
      page += 1;
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
