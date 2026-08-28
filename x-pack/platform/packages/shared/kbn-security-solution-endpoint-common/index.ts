/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Single public entry point for this package. Subpath imports are not supported;
// every consumer imports from '@kbn/security-solution-endpoint-common'.
//
// Every export here is named — `export { symbol } from './path'` — never
// `export * from './path'`. The public surface of this package is therefore
// enumerated in this file, and adding a symbol to a source module does not
// silently widen it.
//
// Populated by the lift commits that follow:
//   - endpoint authz types and privilege key list
//   - response action command names, agent types and the support map
//   - route path constants
//   - per-action request schemas (@kbn/config-schema and generated zod)

export {};
