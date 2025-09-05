/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { InterceptTriggerService } from './intercept_trigger';
import { interceptTriggerRecordSavedObject } from '../saved_objects';
import type { ISavedObjectsRepository } from '@kbn/core/server';

describe('InterceptTriggerService', () => {
  describe('#setup', () => {
    it('invoking setup registers the backing saved object', () => {
      const interceptTrigger = new InterceptTriggerService();

      const coreSetupMock = coreMock.createSetup();

      interceptTrigger.setup(coreSetupMock, {} as any, {
        kibanaVersion: '9.1.0',
      });

      expect(coreSetupMock.savedObjects.registerType).toHaveBeenCalledWith(
        interceptTriggerRecordSavedObject
      );
    });
  });

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
      it('would cause a creation invocation when a trigger with the same ID has not been registered', async () => {
        const interceptTrigger = new InterceptTriggerService();

        const coreSetupMock = coreMock.createSetup();
        const coreStartMock = coreMock.createStart();

        const createSavedObjectFnMock = jest.fn(() => Promise.resolve());

        coreStartMock.savedObjects.createInternalRepository.mockReturnValue({
          create: createSavedObjectFnMock,
          get: jest.fn(() => Promise.resolve({ attributes: null })),
        } as unknown as ISavedObjectsRepository);

        interceptTrigger.setup(coreSetupMock, {} as any, {
          kibanaVersion: '8.0.0',
        });

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
      });

      it('would cause a update invocation when a trigger with the same ID is already registered', async () => {
        const interceptTrigger = new InterceptTriggerService();

        const coreSetupMock = coreMock.createSetup();
        const coreStartMock = coreMock.createStart();

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

        interceptTrigger.setup(coreSetupMock, {} as any, {
          kibanaVersion: '8.0.0',
        });

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
      });
    });
  });
});
