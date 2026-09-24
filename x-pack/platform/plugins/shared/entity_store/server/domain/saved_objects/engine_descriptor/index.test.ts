/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { EngineDescriptorClient } from '.';
import { EngineDescriptorTypeName } from './types';
import { ENGINE_STATUS } from '../../constants';
import type { EngineDescriptor } from './constants';

function makeDescriptor(overrides: Partial<EngineDescriptor> = {}): EngineDescriptor {
  return {
    type: 'user',
    status: ENGINE_STATUS.STARTED,
    error: null,
    logExtractionState: {
      checkpointTimestamp: null,
      paginationId: null,
      lastExecutionTimestamp: null,
      sliceEndTimestamp: null,
    },
    versionState: { version: '2', state: 'running', isMigratedFromV1: false },
    ...overrides,
  } as EngineDescriptor;
}

function buildClient(namespace = 'default', internalRepository = false) {
  const soClient = savedObjectsClientMock.create();
  const logger = loggerMock.create();

  soClient.find.mockResolvedValue({
    saved_objects: [
      {
        id: EngineDescriptorClient.getSavedObjectId('user', namespace),
        type: EngineDescriptorTypeName,
        attributes: makeDescriptor(),
        references: [],
        score: 0,
      },
    ],
    total: 1,
    per_page: 10,
    page: 1,
  });
  soClient.update.mockResolvedValue({
    id: EngineDescriptorClient.getSavedObjectId('user', namespace),
    type: EngineDescriptorTypeName,
    attributes: makeDescriptor(),
    references: [],
  });

  return {
    soClient,
    logger,
    client: new EngineDescriptorClient(soClient, namespace, logger, internalRepository),
  };
}

describe('EngineDescriptorClient.update()', () => {
  describe('internalRepository flag', () => {
    it('does not pass namespace to soClient.update when internalRepository is false (scoped client path)', async () => {
      const { soClient, client } = buildClient('default', false);

      await client.update('user', { status: ENGINE_STATUS.STOPPED });

      expect(soClient.update).toHaveBeenCalledWith(
        EngineDescriptorTypeName,
        expect.any(String),
        expect.any(Object),
        expect.not.objectContaining({ namespace: expect.anything() })
      );
    });

    it('passes namespace to soClient.update when internalRepository is true (internal repository path)', async () => {
      const { soClient, client } = buildClient('my-space', true);

      await client.update('user', { status: ENGINE_STATUS.STOPPED });

      expect(soClient.update).toHaveBeenCalledWith(
        EngineDescriptorTypeName,
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({ namespace: 'my-space' })
      );
    });

    it('defaults internalRepository to false when not provided', async () => {
      const soClient = savedObjectsClientMock.create();
      const logger = loggerMock.create();

      soClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: EngineDescriptorClient.getSavedObjectId('user', 'default'),
            type: EngineDescriptorTypeName,
            attributes: makeDescriptor(),
            references: [],
            score: 0,
          },
        ],
        total: 1,
        per_page: 10,
        page: 1,
      });
      soClient.update.mockResolvedValue({
        id: EngineDescriptorClient.getSavedObjectId('user', 'default'),
        type: EngineDescriptorTypeName,
        attributes: makeDescriptor(),
        references: [],
      });

      // three-argument constructor (no internalRepository flag)
      const client = new EngineDescriptorClient(soClient, 'default', logger);
      await client.update('user', { status: ENGINE_STATUS.STOPPED });

      expect(soClient.update).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Object),
        expect.not.objectContaining({ namespace: expect.anything() })
      );
    });

    it('always sets mergeAttributes: true', async () => {
      const { soClient, client } = buildClient('my-space', true);

      await client.update('user', { status: ENGINE_STATUS.STOPPED });

      expect(soClient.update).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({ mergeAttributes: true })
      );
    });
  });

  describe('getSavedObjectId (static)', () => {
    it('returns the expected composite id', () => {
      expect(EngineDescriptorClient.getSavedObjectId('user', 'default')).toBe(
        `${EngineDescriptorTypeName}-user-default`
      );
      expect(EngineDescriptorClient.getSavedObjectId('host', 'my-space')).toBe(
        `${EngineDescriptorTypeName}-host-my-space`
      );
    });
  });
});
