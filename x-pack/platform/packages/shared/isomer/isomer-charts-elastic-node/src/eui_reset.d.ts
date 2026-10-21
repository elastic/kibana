/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// EUI declares its global reset's types under `src`, but ships the module under `lib`.
declare module '@elastic/eui/lib/global_styling/reset/reset' {
  export const resetStyles: string;
}
