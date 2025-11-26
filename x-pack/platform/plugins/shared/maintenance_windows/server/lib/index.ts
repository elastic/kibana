/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { ILicenseState } from './license_state';
export { LicenseState } from './license_state';
export { verifyApiAccess } from './license_api_access';
export type { ErrorThatHandlesItsOwnResponse, ElasticsearchError } from './errors';
export { isErrorThatHandlesItsOwnResponse } from './errors';
