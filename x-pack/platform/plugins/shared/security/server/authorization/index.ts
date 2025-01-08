/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { Actions, type CasesSupportedOperations } from '@kbn/security-authorization-core';
export type { AuthorizationServiceSetupInternal } from './authorization_service';
export { AuthorizationService } from './authorization_service';
export type { ElasticsearchRole } from './roles';
export { transformElasticsearchRoleToRole, compareRolesByName } from './roles';
