/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// No custom samlAuth extension needed — the tests use `samlAuth.asInteractiveUser('admin')`
// and `samlAuth.asInteractiveUser('viewer')`, which are built-in roles that cover the
// agenticInvestigations `all` and `read` privileges respectively.
export { apiTest } from '@kbn/scout';
export {
  INTERNAL_HEADERS,
  LIST_INCIDENTS_PATH,
  CREATE_INCIDENT_PATH,
  INCIDENT_BY_ID_PATH,
} from './constants';
