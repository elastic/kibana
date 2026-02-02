/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import type { ISavedObjectsRepository } from '@kbn/core/server';
import { createUsageCollectionSetupMock } from '@kbn/usage-collection-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { InterceptTriggerService } from './intercept_trigger';
import { interceptTriggerRecordSavedObject } from '../saved_objects';
import { API_USAGE_COUNTER_TYPE } from '../../common/constants';

const usageCollectionSetupMock = createUsageCollectionSetupMock();

describe('InterceptTriggerService', () => {
  const usageCounter = usageCollectionSetupMock.createUsageCounter('interceptsTriggerTest');

  describe('#start', () => {
    it('should return a specific of properties', () => {
      const interceptTrigger = new InterceptTriggerService();

      const coreStartMock = coreMock.createStart();

      const interceptTriggerStartContract = interceptTrigger.start(coreStartMock);

      expect(interceptTriggerStartContract).toHaveProperty(
        'registerTriggerDefinition',
        expect.any(Function)
      );
    });

    describe('registerTriggerDefinition', () => {
      let interceptTrigger: InterceptTriggerService;

      const coreSetupMock = coreMock.createSetup();
      const coreStartMock = coreMock.createStart();

      beforeEach(() => {
        interceptTrigger = new InterceptTriggerService();
        interceptTrigger.setup(coreSetupMock, {
          logger: loggerMock.create(),
          kibanaVersion: '8.0.0',
          usageCollector: usageCounter,
        });
      });

      afterEach(() => {
        jest.clearAllMocks();
      });

      it('would cause a creation invocation when a trigger with the same ID has not been registered', async () => {
        const createSavedObjectFnMock = jest.fn(() => Promise.resolve());

        coreStartMock.savedObjects.createInternalRepository.mockReturnValue({
          create: createSavedObjectFnMock,
          get: jest.fn(() => Promise.resolve({ attributes: null })),
        } as unknown as ISavedObjectsRepository);

        const { registerTriggerDefinition } = interceptTrigger.start(coreStartMock);

        const triggerId = 'trigger-id';

        await registerTriggerDefinition(triggerId, () => ({
          triggerAfter: '30d',
        }));

        expect(createSavedObjectFnMock).toHaveBeenCalledWith(
          interceptTriggerRecordSavedObject.name,
          {
            firstRegisteredAt: expect.any(String),
            recurrent: expect.any(Boolean),
            triggerAfter: expect.any(String),
            installedOn: expect.any(String),
          },
          { id: triggerId }
        );

        expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
          counterName: `productInterceptTriggerCreation:${triggerId}`,
          counterType: API_USAGE_COUNTER_TYPE,
        });
      });

      it('would cause an update invocation when an existing trigger has its interval configuration updated', async () => {
        const updateSavedObjectFnMock = jest.fn(() => Promise.resolve());

        coreStartMock.savedObjects.createInternalRepository.mockReturnValue({
          update: updateSavedObjectFnMock,
          get: jest.fn((...args) =>
            Promise.resolve({
              attributes: {
                id: args[1],
                // simulate an existing trigger with configured value
                triggerAfter: '30d',
              },
            })
          ),
        } as unknown as ISavedObjectsRepository);

        const { registerTriggerDefinition } = interceptTrigger.start(coreStartMock);

        const triggerId = 'trigger-id';

        await registerTriggerDefinition(triggerId, () => ({
          // provide a new value for the triggerAfter
          triggerAfter: '28d',
        }));

        expect(updateSavedObjectFnMock).toHaveBeenCalledWith(
          interceptTriggerRecordSavedObject.name,
          triggerId,
          {
            triggerAfter: expect.any(String),
          }
        );

        expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
          counterName: `productInterceptTriggerUpdate:${triggerId}`,
          counterType: API_USAGE_COUNTER_TYPE,
        });
      });
    });
  });
});
