/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { basename } from 'https://deno.land/std@0.134.0/path/mod.ts';

const Program = basename(Deno.mainModule);

export function log(message: string) {
  // eslint-disable-next-line no-console
  console.log(`${Program}: ${message}`);
}

export function logExit(code: number, message: string) {
  log(message);
  Deno.exit(code);
}
