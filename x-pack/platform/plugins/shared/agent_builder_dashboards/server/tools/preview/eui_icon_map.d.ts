/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// EUI publishes types for its icon map under `src`, and the compiled module under `lib`.
declare module '@elastic/eui/lib/components/icon/icon_map' {
  export { typeToPathMap } from '@elastic/eui/src/components/icon/icon_map';
}
