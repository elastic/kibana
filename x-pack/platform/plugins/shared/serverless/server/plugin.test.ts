/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { ServerlessPlugin } from './plugin';

describe('Serverless Plugin', () => {
  let plugin: ServerlessPlugin;
  let mockCoreSetup: ReturnType<typeof coreMock.createSetup>;
  let mockCoreStart: ReturnType<typeof coreMock.createStart>;
  beforeEach(() => {
    plugin = new ServerlessPlugin();

    mockCoreSetup = coreMock.createSetup({
      pluginStartContract: {},
    });
    mockCoreStart = coreMock.createStart();
  });

  describe('start()', () => {
    it('throws if project settings are not set up', () => {
      plugin.setup(mockCoreSetup);
      expect(() => plugin.start(mockCoreStart)).toThrowError(
        "The uiSettings allowlist for serverless hasn't been set up. Make sure to set up your serverless project settings with setupProjectSettings()"
      );
    });
  });
});
