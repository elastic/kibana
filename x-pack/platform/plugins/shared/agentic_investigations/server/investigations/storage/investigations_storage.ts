/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { IndexStorageSettings, IStorageClient } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';
import { INVESTIGATION_INDEX_NAME } from '../../../common/investigations/constants';
import type { Investigation } from '../../../common/investigations/investigation';

const storageSettings = {
  name: INVESTIGATION_INDEX_NAME,
  schema: {
    properties: {
      spaceId: types.keyword({}),
      conversationId: types.keyword({}),
      solution: types.keyword({}),
      subjectType: types.keyword({}),
      subjectId: types.keyword({}),
      subjectSummary: types.text({}),
      status: types.keyword({}),
      severity: types.keyword({}),
      // Numeric mirror of `severity` for sort clauses — stored as a `byte` in
      // the index so ordering is a sort clause rather than an in-memory pass.
      // Computed on write from `severity`; never accepted from callers.
      severityRank: types.byte({}),
      title: types.keyword({}),
      summary: types.text({}),
      createdAt: types.date({}),
      startedAt: types.date({}),
      completedAt: types.date({}),
      updatedAt: types.date({}),
      // Nested so compound (name + type) term queries are evaluated per-entity
      // by Elasticsearch rather than across the flattened document array.
      impactedEntities: types.nested({
        properties: {
          name: types.keyword({}),
          nameText: types.text({}),
          type: types.keyword({}),
          featureId: types.keyword({}),
          streamName: types.keyword({}),
        },
      }),
      // Investigation-derived content stored opaque (dynamic: false in the index
      // mapping). Not filterable or aggregatable; used exclusively by attachment
      // resolve() to populate the four investigation attachment types.
      hypotheses: types.object({ dynamic: false }),
      recommendations: types.object({ dynamic: false }),
      blindSpots: types.object({ dynamic: false }),
      // Nightshift-specific fields — allow the client to round-trip its full state.
      triggerType: types.keyword({}),
      concurrencyKey: types.keyword({}),
      executedBy: types.keyword({}),
      error: types.text({}),
      conclusion: types.text({}),
      triggerFeedback: types.object({ dynamic: false }),
    },
  },
} satisfies IndexStorageSettings;

export type InvestigationsStorageSettings = typeof storageSettings;

/**
 * Stored document shape: the id lives in `_id`, everything else in `_source`.
 * `severityRank` is a storage-only field and is stripped before an investigation
 * leaves the service — it never reaches the API contract.
 *
 * Intentionally not named `InvestigationRecord` to avoid ambiguity with
 * `InvestigationRecord` exported from
 * `x-pack/platform/plugins/shared/nightshift_investigations/server/storage/types.ts`,
 * which represents a different persistence model in a sibling plugin. Do not
 * rename this type to `InvestigationRecord` or export it from the plugin's
 * public surface.
 */
export type InvestigationStorageDoc = Omit<Investigation, 'id'>;

export type InvestigationsStorageClient = IStorageClient<
  InvestigationsStorageSettings,
  InvestigationStorageDoc
>;

export const createInvestigationsStorageClient = ({
  esClient,
  kibanaVersion: _kibanaVersion,
  logger,
}: {
  esClient: ElasticsearchClient;
  kibanaVersion: string;
  logger: Logger;
}): InvestigationsStorageClient => {
  const adapter = new StorageIndexAdapter<InvestigationsStorageSettings, InvestigationStorageDoc>(
    esClient,
    logger,
    storageSettings
  );
  return adapter.getClient();
};
