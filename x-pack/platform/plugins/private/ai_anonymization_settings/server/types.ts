/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Setup contract of the AI anonymization settings plugin.
 *
 * A host plugin that wants the settings page to reflect how it runs anonymization declares this
 * plugin as an optional dependency and calls into the contract during its own `setup()`.
 */
export interface AiAnonymizationSettingsPluginSetup {
  /**
   * Configures the page's pattern tester. `enabled: false` makes it refuse requests, which is what
   * a host should pass when it runs anonymization without worker threads, since caller-supplied
   * regexes must not run on the Kibana thread. Passing `true` never overrides
   * `xpack.aiAnonymizationSettings.patternTester.enabled: false`.
   */
  configurePatternTester(options: { enabled: boolean }): void;
}

export type AiAnonymizationSettingsPluginStart = Record<string, never>;
