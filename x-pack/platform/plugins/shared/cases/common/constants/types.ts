/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SERVERLESS_PROJECT_TYPES, OWNERS } from './owners';

export enum HttpApiPrivilegeOperation {
  Read = 'Read',
  Create = 'Create',
  Delete = 'Delete',
}

export type Owner = (typeof OWNERS)[number];
export type ServerlessProjectType = (typeof SERVERLESS_PROJECT_TYPES)[number];
