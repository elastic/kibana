/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PLUGIN_ID = 'inbox' as const;
export const PLUGIN_NAME = 'Inbox' as const;
export const APP_PATH = '/app/inbox' as const;

/**
 * API privilege names. Kept distinct so the Kibana feature model can grant
 * read-only users listing access without also letting them POST a response.
 * Route handlers reference these directly via `requiredPrivileges`.
 */
export const INBOX_API_PRIVILEGE_READ = 'inbox_read' as const;
export const INBOX_API_PRIVILEGE_RESPOND = 'inbox_respond' as const;
