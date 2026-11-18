/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { relative } from 'path';
import { defineConfig } from 'vitest/config';
import preset from '@kbn/vitest/node_preset';

// Every package-level `vitest.config.ts` is a project; `node scripts/vitest` runs them all.
// Packages migrate from Jest one at a time, so this runs alongside `node scripts/jest`.
export default defineConfig({
  test: {
    // Root-level only: Vitest ignores these options in project configs.
    snapshotFormat: preset.test.snapshotFormat,
    // On CI, also write JUnit to target/junit/ for the failed-test reporter. The classname follows
    // the Jest reporter's `<report name>.<path with · for dots>` convention it parses.
    reporters: process.env.CI
      ? [
          'default',
          [
            'junit',
            {
              outputFile: 'target/junit/TEST-Vitest.xml',
              classnameTemplate: ({ filepath }: { filepath: string }) =>
                `Vitest Tests.${relative(import.meta.dirname, filepath).replace(/\./g, '·')}`,
            },
          ],
        ]
      : ['default'],
    projects: [
      '{src,x-pack,packages,examples}/**/vitest.config.ts',
      '!**/{node_modules,target,__fixtures__}/**',
    ],
  },
});
