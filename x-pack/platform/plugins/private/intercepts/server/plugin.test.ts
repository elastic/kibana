/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { coreMock } from '@kbn/core/server/mocks';
import { createUsageCollectionSetupMock } from '@kbn/usage-collection-plugin/server/mocks';
import { InterceptsServerPlugin } from './plugin';
import {
  interceptTriggerRecordSavedObject,
  interceptInteractionUserRecordSavedObject,
} from './saved_objects';

describe('InterceptsServerPlugin', () => {
  let interceptsPlugin: InterceptsServerPlugin;
  let coreSetupMock: ReturnType<typeof coreMock.createSetup>;
  const usageCollectionSetupMock = createUsageCollectionSetupMock();
  const initContext = coreMock.createPluginInitializerContext();

  beforeEach(() => {
    interceptsPlugin = new InterceptsServerPlugin(initContext);
  });

  describe('setup', () => {
    it('should register the backing saved object types for the intercept plugin', () => {
      coreSetupMock = coreMock.createSetup();

      interceptsPlugin.setup(coreSetupMock, { usageCollection: usageCollectionSetupMock });

      expect(coreSetupMock.savedObjects.registerType).toHaveBeenCalledWith(
        interceptTriggerRecordSavedObject
      );

      expect(coreSetupMock.savedObjects.registerType).toHaveBeenCalledWith(
        interceptInteractionUserRecordSavedObject
      );
    });
  });
});
