/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  AGENT_BUILDER_SPACE_SETTINGS_SAVED_OBJECT_TYPE,
  AGENT_BUILDER_SPACE_SETTINGS_OBJECT_ID,
} from '../../saved_objects';
import { createSpaceSettingsService } from './space_settings_service';

const setup = () => {
  const savedObjects = savedObjectsServiceMock.createStartContract();
  const soClient = savedObjectsServiceMock.createStartContract().getScopedClient({} as any);
  savedObjects.getScopedClient.mockReturnValue(soClient);

  const service = createSpaceSettingsService({ savedObjects });
  const request = httpServerMock.createKibanaRequest();

  return { service, soClient, savedObjects, request };
};

describe('createSpaceSettingsService', () => {
  describe('get', () => {
    it('returns the persisted default agent id for the request space', async () => {
      const { service, soClient, request } = setup();
      (soClient.get as jest.Mock).mockResolvedValue({
        attributes: { defaultAgentId: 'siemens-agent' },
      });

      const result = await service.get(request);

      expect(soClient.get).toHaveBeenCalledWith(
        AGENT_BUILDER_SPACE_SETTINGS_SAVED_OBJECT_TYPE,
        AGENT_BUILDER_SPACE_SETTINGS_OBJECT_ID
      );
      expect(result).toEqual({ defaultAgentId: 'siemens-agent' });
    });

    it('returns null when the settings document does not exist', async () => {
      const { service, soClient, request } = setup();
      (soClient.get as jest.Mock).mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          AGENT_BUILDER_SPACE_SETTINGS_SAVED_OBJECT_TYPE,
          'x'
        )
      );

      const result = await service.get(request);

      expect(result).toEqual({ defaultAgentId: null });
    });

    it('propagates unexpected saved-object errors', async () => {
      const { service, soClient, request } = setup();
      (soClient.get as jest.Mock).mockRejectedValue(new Error('boom'));

      await expect(service.get(request)).rejects.toThrow('boom');
    });
  });

  describe('set', () => {
    it('upserts the singleton with the requested default agent id', async () => {
      const { service, soClient, request } = setup();
      (soClient.create as jest.Mock).mockResolvedValue({
        attributes: { defaultAgentId: 'agent-a' },
      });

      const result = await service.set(request, 'agent-a');

      expect(soClient.create).toHaveBeenCalledWith(
        AGENT_BUILDER_SPACE_SETTINGS_SAVED_OBJECT_TYPE,
        { defaultAgentId: 'agent-a' },
        { id: AGENT_BUILDER_SPACE_SETTINGS_OBJECT_ID, overwrite: true }
      );
      expect(result).toEqual({ defaultAgentId: 'agent-a' });
    });

    it('stores an undefined defaultAgentId when clearing the assignment', async () => {
      const { service, soClient, request } = setup();
      (soClient.create as jest.Mock).mockResolvedValue({ attributes: {} });

      const result = await service.set(request, null);

      expect(soClient.create).toHaveBeenCalledWith(
        AGENT_BUILDER_SPACE_SETTINGS_SAVED_OBJECT_TYPE,
        { defaultAgentId: undefined },
        expect.objectContaining({ overwrite: true })
      );
      expect(result).toEqual({ defaultAgentId: null });
    });
  });
});
