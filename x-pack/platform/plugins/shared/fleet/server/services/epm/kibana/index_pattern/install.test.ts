/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';

import { createAppContextStartContractMock } from '../../../../mocks';

import { appContextService } from '../../../app_context';

import { makeManagedIndexPatternsGlobal } from './install';

describe('Fleet index patterns', () => {
  let mockSoClient: jest.Mocked<SavedObjectsClientContract>;
  let mockContract: ReturnType<typeof createAppContextStartContractMock>;

  beforeEach(() => {
    mockSoClient = savedObjectsClientMock.create();
    mockContract = createAppContextStartContractMock();
    appContextService.start(mockContract);
  });

  afterEach(() => {
    appContextService.stop();
  });

  describe('makeManagedIndexPatternsGlobal', () => {
    it('should call updateObjectsSpaces with the correct params', async () => {
      const result = await makeManagedIndexPatternsGlobal(mockSoClient);

      for (const pattern of ['logs-*', 'metrics-*']) {
        expect(mockSoClient.updateObjectsSpaces).toHaveBeenCalledWith(
          [{ id: pattern, type: 'index-pattern' }],
          ['*'],
          []
        );
      }

      expect(result).toHaveLength(2);
    });

    it('handles errors from updateObjectsSpaces', async () => {
      mockSoClient.updateObjectsSpaces.mockRejectedValue(new Error('foo'));

      const result = await makeManagedIndexPatternsGlobal(mockSoClient);

      expect(result).toHaveLength(0);
    });
  });
});
