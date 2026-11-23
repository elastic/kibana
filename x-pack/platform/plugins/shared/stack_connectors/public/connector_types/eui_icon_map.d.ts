/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// EUI ships no declaration for this module. It holds the runtime list of glyph
// names, which `index.test.ts` needs to validate registered `iconClass` values.
// The public `ICON_TYPES` export is unusable here: jest resolves `@elastic/eui`
// to the `test-env` build, where that array is empty.
declare module '@elastic/eui/lib/components/icon/icon_map' {
  export const typeToPathMap: Record<string, unknown>;
}
