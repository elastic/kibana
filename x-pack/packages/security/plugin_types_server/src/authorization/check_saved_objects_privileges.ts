/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

import type { CheckPrivilegesResponse } from './check_privileges';

export type CheckSavedObjectsPrivilegesWithRequest = (
  request: KibanaRequest
) => CheckSavedObjectsPrivileges;

export type CheckSavedObjectsPrivileges = (
  actions: string | string[],
  namespaceOrNamespaces?: string | Array<undefined | string>
) => Promise<CheckPrivilegesResponse>;
