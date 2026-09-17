/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiPrivileges } from '@kbn/core-security-server';

/**
 * These constants must live server-side because `ApiPrivileges` ships from a
 * server package, and the zod schemas in `common/` cannot import server modules.
 */
export const INCIDENTS_API_PRIVILEGE_READ = ApiPrivileges.read('incidents');
export const INCIDENTS_API_PRIVILEGE_MANAGE = ApiPrivileges.manage('incidents');
