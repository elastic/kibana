/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The id becomes part of an Elasticsearch index name, which is capped at 255 bytes. A limit of 128
// characters stays well under that once the index prefix is added.
export const INFERENCE_ID_MAX_LENGTH = 128;

// The id becomes part of an Elasticsearch index name, so it must be lowercase (index names cannot
// contain uppercase) and must not contain multi-index or pattern characters such as `,` and `*`.
const INFERENCE_ID_PATTERN = /^[a-z0-9._-]+$/;

/**
 * Returns true if the inference id is safe to embed in an Elasticsearch index name.
 */
export const isValidInferenceId = (inferenceId: string): boolean =>
  inferenceId.length > 0 &&
  inferenceId.length <= INFERENCE_ID_MAX_LENGTH &&
  INFERENCE_ID_PATTERN.test(inferenceId);

/**
 * Returns a validation error message for the inference id, or undefined when it is valid.
 */
export const validateInferenceId = (inferenceId: string): string | undefined =>
  isValidInferenceId(inferenceId)
    ? undefined
    : `inferenceId must be 1-${INFERENCE_ID_MAX_LENGTH} characters of lowercase letters, digits, '.', '_' or '-'`;
