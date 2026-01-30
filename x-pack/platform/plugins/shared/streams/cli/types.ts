/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlagOptions } from '@kbn/dev-cli-runner/src/flags/types';
import type { HttpClient } from './http_client';

export interface CliContext {
  httpClient: HttpClient;
  shutdown: () => Promise<void>;
}

export const GLOBAL_FLAGS: FlagOptions = {
  string: ['es-url', 'kibana-url', 'username', 'password'],
  boolean: ['json', 'yes'],
  default: {
    username: 'elastic',
    password: 'changeme',
    json: false,
    yes: false,
  },
  help: `
    Global Flags:
      --es-url         Elasticsearch URL (defaults to http://localhost:9200)
      --kibana-url     Kibana URL (defaults to local bootstrap)
      --username       Auth username (defaults to elastic)
      --password       Auth password (defaults to changeme)
      --json           Output JSON to stdout (no extra noise)
      --yes            Skip confirmation prompts for destructive operations
  `,
};

export const EXIT_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  FLAG_ERROR: 2,
  USER_CANCELLED: 3,
} as const;
