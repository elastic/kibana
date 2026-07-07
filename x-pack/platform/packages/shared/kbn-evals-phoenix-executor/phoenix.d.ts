/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Phoenix uses `exports` in package.json, which we don't have support for yet,
// until we can set `module` in tsconfig.json to something more modern.

declare module '@arizeai/phoenix-client/datasets' {
  export * from '@arizeai/phoenix-client/dist/esm/datasets/index';
}

declare module '@arizeai/phoenix-client/experiments' {
  export * from '@arizeai/phoenix-client/dist/esm/experiments';
}
