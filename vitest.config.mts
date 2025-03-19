/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mergeConfig } from 'vitest/config';
import baseConfig from './vitest.base.mts';

// eslint-disable-next-line import/no-default-export
export default mergeConfig(baseConfig, {
  test: {
    workspace: [
      'x-pack/platform/plugins/shared/*',
      {
        extends: true,
        test: {
          include: ['**/api_tests/**/*.spec.ts'],
          name: 'platform-plugins-shared',
          testTimeout: 60_000,
        },
      },
      'x-pack/platform/plugins/private/*',
      {
        extends: true,
        test: {
          include: ['**/api_tests/**/*.spec.ts'],
          name: 'platform-plugins-private',
          testTimeout: 60_000,
        },
      },
    ],
  },
});
