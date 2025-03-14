/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Must precede any llm module imports
import * as Langtrace from '@langtrase/typescript-sdk';
import { DiagLogLevel } from '@opentelemetry/api';

export function initLangtrace() {
  const apiKey = process.env.LANGTRACE_API_KEY;
  const apiHost = process.env.LANGTRACE_API_HOST;
  if (apiKey && apiHost) {
    Langtrace.init({
      api_host: apiHost,
      api_key: apiKey,
      logging: {
        level: DiagLogLevel.DEBUG,
        disable: true,
      },
    });
  }
}
