/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { INTEGRATION_SAVED_OBJECT_TYPE } from './services/saved_objects/constants';
import { hasIntegration } from './has_integration';

describe('hasIntegration', () => {
  const savedObjectsClient = savedObjectsClientMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when the integration-config exists in the space', async () => {
    savedObjectsClient.get.mockResolvedValue({
      id: 'my_integration',
      type: INTEGRATION_SAVED_OBJECT_TYPE,
      attributes: { integration_id: 'my_integration' },
      references: [],
    });

    await expect(hasIntegration(savedObjectsClient, 'my_integration', 'default')).resolves.toBe(
      true
    );

    expect(savedObjectsClient.get).toHaveBeenCalledWith(
      INTEGRATION_SAVED_OBJECT_TYPE,
      'my_integration',
      { namespace: 'default' }
    );
  });

  it('returns false when the integration-config is not found', async () => {
    savedObjectsClient.get.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError(
        INTEGRATION_SAVED_OBJECT_TYPE,
        'missing_integration'
      )
    );

    await expect(
      hasIntegration(savedObjectsClient, 'missing_integration', 'security')
    ).resolves.toBe(false);
  });

  it('rethrows unexpected saved object errors', async () => {
    const unexpected = new Error('elasticsearch unavailable');
    savedObjectsClient.get.mockRejectedValue(unexpected);

    await expect(hasIntegration(savedObjectsClient, 'my_integration', 'default')).rejects.toBe(
      unexpected
    );
  });
});
