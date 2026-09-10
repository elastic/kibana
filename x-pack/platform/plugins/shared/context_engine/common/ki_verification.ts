/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ESQL_VALID_SYNTAX_VERIFIER_ID = 'esql-valid-syntax';
export const ESQL_VALID_RUNTIME_VERIFIER_ID = 'esql-valid-runtime';

/** Prefix of the summary id for a custom verifier workflow: `workflow:<workflow_id>`. */
export const WORKFLOW_VERIFIER_ID_PREFIX = 'workflow:';

export const KI_VERIFIER_IDS = [
  ESQL_VALID_SYNTAX_VERIFIER_ID,
  ESQL_VALID_RUNTIME_VERIFIER_ID,
] as const;
