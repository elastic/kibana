/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const AGENTIC_INVESTIGATIONS_PLUGIN_ID = 'agenticInvestigations' as const;

/** Shared by every entity's routes, so a caller versions the whole surface at once. */
export const AGENTIC_INVESTIGATIONS_API_VERSION = '1' as const;

/** Base path every entity nests its internal routes under. */
export const AGENTIC_INVESTIGATIONS_INTERNAL_URL = '/internal/investigations' as const;

/**
 * Owner id used when registering managed workflows. Registered in `setup()` and
 * passed to `initManagedWorkflowsClient`; it must equal the `pluginId` on every
 * managed workflow definition this plugin owns, or `assertPluginRegistration`
 * throws on install.
 */
export const AGENTIC_INVESTIGATIONS_MANAGED_WORKFLOW_OWNER_ID = 'agenticInvestigations' as const;
