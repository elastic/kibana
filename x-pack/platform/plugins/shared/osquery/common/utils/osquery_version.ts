/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const OSQUERY_VERSION_REGEX = /^\d+(\.\d+){0,2}$/;

// Matches OpenAPI `MinOsqueryVersionInput.maxLength` / `PackQueryVersionInput.maxLength`
// in `common/api/model/schema/common_attributes.schema.yaml`.
export const MIN_OSQUERY_VERSION_MAX_LENGTH = 64;

// Checks the raw value exactly as the pack API codec does, so a stored value the
// form accepts is never rejected on save. Callers trim typed input themselves.
export const isValidOsqueryVersion = (value: string): boolean =>
  value.length <= MIN_OSQUERY_VERSION_MAX_LENGTH && OSQUERY_VERSION_REGEX.test(value);
