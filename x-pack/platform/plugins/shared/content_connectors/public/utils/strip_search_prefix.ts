/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function stripSearchPrefix(input: string, replacement?: string): string {
  return input?.startsWith('search-')
    ? `${replacement || ''}${input.substring(7)}`
    : `${replacement || ''}${input}` || '';
}
