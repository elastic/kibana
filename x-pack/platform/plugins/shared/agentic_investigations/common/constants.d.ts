/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export declare const AGENTIC_INVESTIGATIONS_PLUGIN_ID: 'agenticInvestigations';
/** Shared by every entity's routes, so a caller versions the whole surface at once. */
export declare const AGENTIC_INVESTIGATIONS_API_VERSION: '1';
/** Base path every entity nests its internal routes under. */
export declare const AGENTIC_INVESTIGATIONS_INTERNAL_URL: '/internal/investigations';
/** Shared user-profile suggest endpoint, used by both escalation and investigation pickers. */
export declare const SUGGEST_USER_PROFILES_URL: '/internal/investigations/_suggest_user_profiles';
