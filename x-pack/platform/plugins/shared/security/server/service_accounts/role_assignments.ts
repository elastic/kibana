/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceAccountRoleAssignments } from '@kbn/core-security-server';

/**
 * The role assignments Kibana sends when creating a service account.
 *
 * UIAM's first iteration does not support downscoping: the service account is created with the
 * privileges of the caller minus any control plane privileges, exactly like the `api-keys/_grant`
 * API. This payload is the literal UIAM expects in order to select that behaviour, so it is a
 * constant rather than something callers choose. The response, by contrast, carries the full role
 * assignments model UIAM resolved.
 *
 * TODO(https://github.com/elastic/kibana/issues/284463): revisit when UIAM adds downscoping. That
 * design is blocked on a Kibana decision — whether users pick separate roles for the origin project
 * and each linked project, or one set of roles that applies to all of them.
 */
export const SERVICE_ACCOUNT_ROLE_ASSIGNMENTS: ServiceAccountRoleAssignments = {
  limit: {
    access: ['application'],
    resource: ['project'],
  },
};
