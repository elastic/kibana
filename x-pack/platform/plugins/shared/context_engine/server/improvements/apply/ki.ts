/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { isIndexPattern } from '../../../common/ai_index_dest';
import type { AiIndexDest } from '../../../common/http_api/ai_indices';
import type { ImprovementKiPayload } from '../../../common/http_api/improvements';
import {
  KI_EXCLUDED_AT_ATTRIBUTE,
  KI_EXCLUDED_ATTRIBUTE,
  KI_EXCLUDED_REASON_ATTRIBUTE,
} from '../../../common/ki_lifecycle';
import { ApplyImprovementError } from './errors';

/**
 * Writes to an AI index destination.
 *
 * Adds go through `op_type: 'create'`, the only write a data stream accepts. Edits and removals go
 * through `_update_by_query` on the document `_id`: a data stream rejects an index-or-update by id
 * outright, and `_update_by_query` is the one form that works against both a data stream and a
 * plain index, so there is a single code path rather than a branch per destination type.
 */

/** Painless that assigns each provided top-level field, merging `attributes` key by key. */
const UPDATE_FIELDS_SCRIPT = `
for (entry in params.fields.entrySet()) {
  ctx._source[entry.getKey()] = entry.getValue();
}
if (params.attributes != null) {
  if (ctx._source.attributes == null) {
    ctx._source.attributes = [:];
  }
  for (entry in params.attributes.entrySet()) {
    ctx._source.attributes[entry.getKey()] = entry.getValue();
  }
}
`.trim();

/** Strips keys the agent left unset so an edit never blanks a field it did not mention. */
const definedEntries = (payload: ImprovementKiPayload): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(payload).filter(([key, value]) => key !== 'attributes' && value !== undefined)
  );

const assertWritableDest = (dest: AiIndexDest): void => {
  if (isIndexPattern(dest.value)) {
    throw new ApplyImprovementError(
      `AI index destination [${dest.value}] is a pattern, so a Knowledge Indicator cannot be written to it. Point the AI index at a single data stream or index first.`
    );
  }
};

/**
 * Creates a Knowledge Indicator in the destination and returns its `_id`, which becomes the handle
 * a later `edit_ki` or `remove_ki` targets.
 */
export const addKi = async ({
  esClient,
  dest,
  ki,
  now,
}: {
  esClient: ElasticsearchClient;
  dest: AiIndexDest;
  ki: ImprovementKiPayload;
  now: string;
}): Promise<string> => {
  assertWritableDest(dest);

  const response = await esClient.index({
    index: dest.value,
    // A data stream accepts nothing else, and on a plain index it still means "must not already exist".
    op_type: 'create',
    refresh: 'wait_for',
    document: {
      // Required by every `ai-index-ds-*` data stream, and mapped on plain AI indices too.
      '@timestamp': now,
      ...definedEntries(ki),
      ...(ki.attributes ? { attributes: ki.attributes } : {}),
    },
  });

  return response._id;
};

const updateKiById = async ({
  esClient,
  dest,
  kiId,
  fields,
  attributes,
}: {
  esClient: ElasticsearchClient;
  dest: AiIndexDest;
  kiId: string;
  fields: Record<string, unknown>;
  attributes?: Record<string, unknown>;
}): Promise<void> => {
  const response = await esClient.updateByQuery({
    index: dest.value,
    refresh: true,
    query: { ids: { values: [kiId] } },
    script: {
      source: UPDATE_FIELDS_SCRIPT,
      lang: 'painless',
      params: { fields, ...(attributes ? { attributes } : {}) },
    },
  });

  const failures = response.failures ?? [];
  if (failures.length > 0) {
    throw new ApplyImprovementError(
      `Failed to update Knowledge Indicator [${kiId}] in [${dest.value}]: ${JSON.stringify(
        failures[0]
      )}`
    );
  }

  if ((response.updated ?? 0) === 0) {
    throw new ApplyImprovementError(
      `Knowledge Indicator [${kiId}] was not found in [${dest.value}]. It may have been removed since the suggestion was made.`
    );
  }
};

/** Applies the agent's replacement fields to an existing Knowledge Indicator. */
export const editKi = async ({
  esClient,
  dest,
  kiId,
  ki,
}: {
  esClient: ElasticsearchClient;
  dest: AiIndexDest;
  kiId: string;
  ki: ImprovementKiPayload;
}): Promise<string> => {
  const fields = definedEntries(ki);
  if (Object.keys(fields).length === 0 && ki.attributes === undefined) {
    throw new ApplyImprovementError(
      `The suggestion for Knowledge Indicator [${kiId}] does not change any field.`
    );
  }

  await updateKiById({ esClient, dest, kiId, fields, attributes: ki.attributes });
  return kiId;
};

/**
 * Flags a Knowledge Indicator as excluded instead of deleting it, so the removal is recoverable and
 * the document remains available for anyone auditing what the loop changed.
 */
export const removeKi = async ({
  esClient,
  dest,
  kiId,
  now,
  reason,
}: {
  esClient: ElasticsearchClient;
  dest: AiIndexDest;
  kiId: string;
  now: string;
  reason?: string;
}): Promise<string> => {
  await updateKiById({
    esClient,
    dest,
    kiId,
    fields: {},
    attributes: {
      [KI_EXCLUDED_ATTRIBUTE]: true,
      [KI_EXCLUDED_AT_ATTRIBUTE]: now,
      ...(reason ? { [KI_EXCLUDED_REASON_ATTRIBUTE]: reason } : {}),
    },
  });
  return kiId;
};
