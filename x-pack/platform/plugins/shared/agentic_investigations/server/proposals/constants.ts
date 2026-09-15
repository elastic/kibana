/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiPrivileges } from '@kbn/core-security-server';

/**
 * Route privileges follow the platform `<operation>_<subject>` convention. They
 * live server-side because `ApiPrivileges` ships from a server package, and the
 * browser never needs them.
 */
export const PROPOSALS_API_PRIVILEGE_READ = ApiPrivileges.read('proposals');
export const PROPOSALS_API_PRIVILEGE_MANAGE = ApiPrivileges.manage('proposals');
