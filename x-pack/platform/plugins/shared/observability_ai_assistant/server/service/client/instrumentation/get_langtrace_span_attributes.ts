/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getLangtraceSpanAttributes() {
  return {
    'langtrace.sdk.name': '@langtrase/typescript-sdk',
    'langtrace.service.type': 'llm',
    'langtrace.service.version': 'unknown',
    'langtrace.version': '2.1.0',
  };
}
