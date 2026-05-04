/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-nodejs-modules
import { resolve } from 'path';

import execa from 'execa';

describe('Security AI Assistant OpenAPI route schemas', () => {
  jest.setTimeout(120000);

  it('pass Redocly lint via openapi:validate script', async () => {
    await execa(process.execPath, ['scripts/openapi/validate.js'], {
      cwd: resolve(__dirname, '../..'),
    });
  });
});
