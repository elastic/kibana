/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const INTERNAL_HEADERS = {
  'kbn-xsrf': 'scout',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '1',
} as const;

export const LIST_ESCALATIONS_PATH = 'internal/investigations/escalations';
export const CREATE_ESCALATION_PATH = 'internal/investigations/escalations';
export const ESCALATION_BY_ID_PATH = (id: string) => `internal/investigations/escalations/${id}`;
