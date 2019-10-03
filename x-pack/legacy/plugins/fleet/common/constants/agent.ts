/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export enum AGENT_TYPE {
  PERMANENT = 'PERMANENT',
  EPHEMERAL = 'EPHEMERAL',
  EPHEMERAL_INSTANCE = 'EPHEMERAL_INSTANCE',
  TEMPORARY = 'TEMPORARY',
}

export const AGENT_POLLING_THRESHOLD_MS = 30000;
