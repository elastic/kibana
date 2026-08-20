/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Browser EUID API — loaded as a separate chunk to keep entity_store page-load bundle under limit.
 * Do not import this file from the plugin's main public/index.ts; use loadEuidApi() instead.
 */

export { euid } from '../common/euid_helpers';
export type { IdentitySourceFields } from '../common';
