/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectsClientContract,
  ISavedObjectsRepository,
  SavedObjectsErrorHelpers,
} from '@kbn/core/server';
import {
  PartiallyUpdateableAdHocRunAttributes,
  partiallyUpdateAdHocRun,
} from './partially_update_ad_hoc_run';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { AD_HOC_RUN_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { adHocRunStatus } from '../../../common/constants';

const MockSavedObjectsClientContract = savedObjectsClientMock.create();
const MockISavedObjectsRepository =
  MockSavedObjectsClientContract as unknown as jest.Mocked<ISavedObjectsRepository>;

describe('partiallyUpdateAdHocRun', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  for (const [soClientName, soClient] of Object.entries(getMockSavedObjectClients()))
    describe(`using ${soClientName}`, () => {
      test('should work with no options', async () => {
        soClient.update.mockResolvedValueOnce(MockUpdateValue);

        await partiallyUpdateAdHocRun(soClient, MockAdHocRunId, DefaultAttributes);
        expect(soClient.update).toHaveBeenCalledWith(
          AD_HOC_RUN_SAVED_OBJECT_TYPE,
          MockAdHocRunId,
          DefaultAttributes,
          {}
        );
      });

      test('should strip unallowed attributes ', async () => {
        const attributes = UnallowedAttributes as unknown as PartiallyUpdateableAdHocRunAttributes;
        soClient.update.mockResolvedValueOnce(MockUpdateValue);

        await partiallyUpdateAdHocRun(soClient, MockAdHocRunId, attributes);
        expect(soClient.update).toHaveBeenCalledWith(
          AD_HOC_RUN_SAVED_OBJECT_TYPE,
          MockAdHocRunId,
          DefaultAttributes,
          {}
        );
      });

      test('should work with extraneous attributes ', async () => {
        const attributes = ExtraneousAttributes as unknown as PartiallyUpdateableAdHocRunAttributes;
        soClient.update.mockResolvedValueOnce(MockUpdateValue);

        await partiallyUpdateAdHocRun(soClient, MockAdHocRunId, attributes);
        expect(soClient.update).toHaveBeenCalledWith(
          AD_HOC_RUN_SAVED_OBJECT_TYPE,
          MockAdHocRunId,
          ExtraneousAttributes,
          {}
        );
      });

      test('should handle SO errors', async () => {
        soClient.update.mockRejectedValueOnce(new Error('wops'));

        await expect(
          partiallyUpdateAdHocRun(soClient, MockAdHocRunId, DefaultAttributes)
        ).rejects.toThrowError('wops');
      });

      test('should handle the version option', async () => {
        soClient.update.mockResolvedValueOnce(MockUpdateValue);

        await partiallyUpdateAdHocRun(soClient, MockAdHocRunId, DefaultAttributes, {
          version: '1.2.3',
        });
        expect(soClient.update).toHaveBeenCalledWith(
          AD_HOC_RUN_SAVED_OBJECT_TYPE,
          MockAdHocRunId,
          DefaultAttributes,
          {
            version: '1.2.3',
          }
        );
      });

      test('should handle the ignore404 option', async () => {
        const err = SavedObjectsErrorHelpers.createGenericNotFoundError();
        soClient.update.mockRejectedValueOnce(err);

        await partiallyUpdateAdHocRun(soClient, MockAdHocRunId, DefaultAttributes, {
          ignore404: true,
        });
        expect(soClient.update).toHaveBeenCalledWith(
          AD_HOC_RUN_SAVED_OBJECT_TYPE,
          MockAdHocRunId,
          DefaultAttributes,
          {}
        );
      });

      test('should handle the namespace option', async () => {
        soClient.update.mockResolvedValueOnce(MockUpdateValue);

        await partiallyUpdateAdHocRun(soClient, MockAdHocRunId, DefaultAttributes, {
          namespace: 'bat.cave',
        });
        expect(soClient.update).toHaveBeenCalledWith(
          AD_HOC_RUN_SAVED_OBJECT_TYPE,
          MockAdHocRunId,
          DefaultAttributes,
          {
            namespace: 'bat.cave',
          }
        );
      });
    });
});

function getMockSavedObjectClients(): Record<
  string,
  jest.Mocked<SavedObjectsClientContract | ISavedObjectsRepository>
> {
  return {
    SavedObjectsClientContract: MockSavedObjectsClientContract,
    // doesn't appear to be a mock for this, but it's basically the same as the above,
    // so just cast it to make sure we catch any type errors
    ISavedObjectsRepository: MockISavedObjectsRepository,
  };
}

const DefaultAttributes = {
  status: adHocRunStatus.RUNNING,
  schedule: [
    { interval: '1h', status: adHocRunStatus.COMPLETE, runAt: '2023-10-19T03:07:40.011Z' },
    { interval: '1h', status: adHocRunStatus.PENDING, runAt: '2023-10-20T03:07:40.011Z' },
    { interval: '1h', status: adHocRunStatus.PENDING, runAt: '2023-10-21T03:07:40.011Z' },
    { interval: '1h', status: adHocRunStatus.PENDING, runAt: '2023-10-22T03:07:40.011Z' },
  ],
};

const UnallowedAttributes = { ...DefaultAttributes, spaceId: 'yo' };
const ExtraneousAttributes = { ...DefaultAttributes, foo: 'bar' };

const MockAdHocRunId = 'abc';

const MockUpdateValue = {
  id: MockAdHocRunId,
  type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
  attributes: DefaultAttributes,
  references: [],
};
