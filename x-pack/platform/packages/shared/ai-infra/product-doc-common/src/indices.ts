/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isImpliedDefaultElserInferenceId } from './is_default_inference_endpoint';
import { validateInferenceId } from './inference_id';
import type { ProductName } from './product';

/**
 * Returns the index name suffix for an inference ID, or an empty string for the implied default
 * ELSER endpoint. The id is validated before the implied-default check, because that check is a
 * substring match on `elser` that would otherwise let a malformed ELSER-like id (e.g. `elser,x`)
 * skip validation and silently resolve to the default index.
 */
const getInferenceIdSuffix = (inferenceId?: string): string => {
  if (inferenceId === undefined) {
    return '';
  }
  const error = validateInferenceId(inferenceId);
  if (error) {
    throw new Error(error);
  }
  if (isImpliedDefaultElserInferenceId(inferenceId)) {
    return '';
  }
  return `-${inferenceId}`;
};

export const productDocIndexPrefix = '.kibana_ai_product_doc';
export const productDocIndexPattern = `${productDocIndexPrefix}_*`;

export const getProductDocIndexName = (productName: ProductName, inferenceId?: string): string => {
  return `${productDocIndexPrefix}_${productName.toLowerCase()}${getInferenceIdSuffix(
    inferenceId
  )}`;
};

/**
 * Index name prefix for Security Labs content.
 */
export const securityLabsIndexPrefix = '.kibana_ai_security_labs';

/**
 * Index pattern for Security Labs content.
 */
export const securityLabsIndexPattern = `${securityLabsIndexPrefix}*`;

/**
 * Returns the index name for Security Labs content.
 * Format: .kibana_ai_security_labs[-{inferenceId}]
 */
export const getSecurityLabsIndexName = (inferenceId?: string): string => {
  return `${securityLabsIndexPrefix}${getInferenceIdSuffix(inferenceId)}`;
};

/**
 * Index name prefix for OpenAPI Spec content.
 */
export const openApiSpecIndexPrefix = '.kibana_ai_openapi_spec';

/**
 * Index pattern for OpenAPI Spec content.
 */
export const openApiSpecIndexPattern = `${openApiSpecIndexPrefix}*`;

/**
 * Returns the index name for OpenAPI Spec content.
 * Format: .kibana_ai_openapi_spec[-{inferenceId}]
 */
export const getOpenApiSpecIndexName = (inferenceId?: string): string => {
  return `${openApiSpecIndexPrefix}${getInferenceIdSuffix(inferenceId)}`;
};
