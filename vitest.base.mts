/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { defineConfig } from 'vitest/config';

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  test: {
    name: 'Scout Api Integration Tests',
    exclude: ['bazel*', 'node_modules/*'],
    environment: 'node',
    globals: false,
    watch: false,
    /*
    When using threads you are unable to use process related APIs such as
    process.chdir().
    Some libraries written in native languages, such as Prisma,
    bcrypt and canvas, have problems when running in multiple threads and
    run into segfaults.
    In these cases it is advised to use forks pool instead.
    */
    pool: 'threads',
    provide: {
      // Must be serializable
      SOME_KEY: 'some value defined in base vitest conf',
    },
  },
});
