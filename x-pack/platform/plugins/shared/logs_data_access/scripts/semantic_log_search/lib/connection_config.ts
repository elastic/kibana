/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlagsReader } from '@kbn/dev-cli-runner';

export interface ConnectionConfig {
  esUrl: string;
  user: string;
  password: string;
  sourceIndex: string;
  targetDataStream: string;
}

export function getConnectionConfig(flags: FlagsReader): ConnectionConfig {
  return {
    esUrl: String(flags.es || 'http://localhost:9200'),
    user: String(flags.user || 'elastic'),
    password: String(flags.password || 'changeme'),
    sourceIndex: String(flags.source || 'logs-synth-default'),
    targetDataStream: String(flags.target || 'logs-poc.a-default'),
  };
}
