/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { isNotFoundError } from '@kbn/es-errors';
import { REQUIRED_FIELDS } from './constants';

/** Outcome of the field check. Three states, because "no data" and "wrong mapping" need different fixes. */
export type FieldCheck = 'ok' | 'no_matching_indices' | 'missing_fields';

// `indices` is typed `IndexName | IndexName[]` and documented as nullable, so it cannot be read as
// an array directly.
// https://github.com/elastic/kibana/blob/e4119fa64930/src/platform/plugins/shared/data_views/server/fetcher/lib/field_capabilities/field_capabilities.ts#L113
function resolvedIndexCount(indices: string | string[] | undefined | null): number {
  if (Array.isArray(indices)) return indices.length;
  return indices ? 1 : 0;
}

/**
 * Checks that the target resolves to data that runtime semantic search can categorize.
 *
 * Distinguishes a target that resolves to nothing from one whose indices lack `message` or
 * `@timestamp`: the first is a wrong target, the second is a mapping problem, and reporting both as
 * "missing fields" sends the reader to the wrong place. A wildcard matching nothing answers 200 with
 * an empty `indices`, while an absent concrete index answers 404, so both shapes are handled.
 *
 * Every other error is intentionally propagated, so callers do not misreport authorization or
 * transport failures as a problem with the data.
 */
export async function hasRequiredFields(
  esClient: ElasticsearchClient,
  target: string
): Promise<FieldCheck> {
  let response;
  try {
    response = await esClient.fieldCaps({
      index: target,
      fields: [...REQUIRED_FIELDS],
    });
  } catch (error) {
    if (isNotFoundError(error)) {
      return 'no_matching_indices';
    }
    throw error;
  }

  if (resolvedIndexCount(response.indices) === 0) {
    return 'no_matching_indices';
  }

  const hasAllFields = REQUIRED_FIELDS.every((field) => {
    const capabilities = response.fields[field];
    return capabilities !== undefined && Object.keys(capabilities).length > 0;
  });

  return hasAllFields ? 'ok' : 'missing_fields';
}

/** Returns true when the configured RERANK inference endpoint is available on the cluster. */
export async function detectRerankCapability(
  esClient: ElasticsearchClient,
  inferenceId: string
): Promise<boolean> {
  try {
    const response = await esClient.inference.get({ inference_id: inferenceId });
    return (response.endpoints?.length ?? 0) > 0;
  } catch (error) {
    // Only a genuine 404 means the endpoint is absent. Authorization (403) and transport (503)
    // failures must propagate so callers do not misreport them as a missing cluster feature.
    if (isNotFoundError(error)) {
      return false;
    }
    throw error;
  }
}
