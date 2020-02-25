/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import jest from 'jest';
import { resolve } from 'path';

import { createJestConfig } from './create_jest_config';

export function runJest() {
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  const config = JSON.stringify(
    createJestConfig({
      kibanaDirectory: resolve(__dirname, '../../..'),
      xPackKibanaDirectory: resolve(__dirname, '../..'),
    })
  );

  const argv = [...process.argv.slice(2), '--config', config];

  return jest.run(argv);
}
