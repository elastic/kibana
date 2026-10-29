/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A user principal in a managed AI index privilege entry (`permissions.kibana.privileges.name`).
 * No role grants an action of this shape, so Elasticsearch's document-level security never shows a
 * user-scoped document to a direct query; Kibana's visibility filter treats it as held by that user.
 */
export const USER_PRINCIPAL_PREFIX = 'user://';

export const toUserPrincipal = (stableUserId: string): string =>
  `${USER_PRINCIPAL_PREFIX}${stableUserId}`;

export const isUserPrincipal = (name: string): boolean => name.startsWith(USER_PRINCIPAL_PREFIX);
