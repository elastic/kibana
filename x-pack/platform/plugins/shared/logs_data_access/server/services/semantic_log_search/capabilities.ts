/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { isNotFoundError } from '@kbn/es-errors';
import { REQUIRED_FIELDS } from './constants';

/** Result of checking target indices and required fields. */
export type FieldCheck = 'ok' | 'no_matching_indices' | 'missing_fields';

function resolvedIndexCount(indices: string | string[] | undefined | null): number {
  if (Array.isArray(indices)) return indices.length;
  return indices ? 1 : 0;
}

/** Checks whether the target resolves to indices and exposes the required fields. */
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

/** Checks whether the configured inference endpoint exists. */
export async function detectRerankCapability(
  esClient: ElasticsearchClient,
  inferenceId: string
): Promise<boolean> {
  try {
    const response = await esClient.inference.get({ inference_id: inferenceId });
    return (response.endpoints?.length ?? 0) > 0;
  } catch (error) {
    // Treat 404 as a missing endpoint and propagate other errors.
    if (isNotFoundError(error)) {
      return false;
    }
    throw error;
  }
}
