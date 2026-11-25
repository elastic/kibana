/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Setup contract of the secrets plugin. It has no members: dependants use its presence to know,
 * at setup, that the plugin is enabled.
 */
export type SecretsPluginSetup = Record<string, never>;

/** Start contract of the secrets plugin. */
export type SecretsPluginStart = Record<string, never>;
