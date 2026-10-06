/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION =
  'Indicates an invalid schema or parameters.';

/** The merge contract every PATCH endpoint follows. Written once so the endpoints cannot disagree. */
export const PATCH_SEMANTICS_DESCRIPTION =
  'Apply a partial update. A field you omit keeps its stored value, and that applies at every level: send `{"matcher": {"tags": ["prod"]}}` to change `tags` while leaving `expression` alone. Send `null` to clear a field, again at any level: `{"matcher": {"expression": null}}` clears just the expression, while `{"matcher": null}` clears the whole object. Lists and variant objects are replaced as a unit rather than merged, since a partly-sent variant could never be valid. The merged result is validated as a whole, so a patch that would leave the resource invalid is rejected with a `400` and nothing is stored.';
