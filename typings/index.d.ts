/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

declare module 'axios/lib/adapters/xhr';

declare module 'find-cypress-specs';

declare module '@cypress/grep' {
  export function register(): void;
}

declare module '@cypress/grep/plugin' {
  interface CypressConfigOptions {
    env?: Record<string, unknown>;
    specPattern?: string | string[];
    excludeSpecPattern?: string | string[];
  }
  export function plugin(config: CypressConfigOptions): CypressConfigOptions;
}
