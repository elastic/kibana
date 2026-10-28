/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { createActor, waitFor, type Actor, type AnyActorRef } from 'xstate';
import { createDefaultUnit } from '../../../../services/unit_repository';
import type { DestinationApiKeyGenerationDeps } from '../destination_api_keys';
import type { UnitDestination } from '../destination_models';
import { REMOTE_ELASTICSEARCH_TYPE } from '../remote_elasticsearch_constants';
import {
  createDestinationsMachineImplementations,
  destinationsStateMachine,
  type DestinationsParentEvent,
} from './destinations_state_machine';

type DestinationsActor = Actor<typeof destinationsStateMachine>;

const apiKeyResponse = { id: 'k', name: 'k', createdAt: 'now', encodedApiKey: 'enc' };
const REMOTE_KEY = 'remote-key-value-1';

describe('destinationsStateMachine', () => {
  const unitDefinition = createDefaultUnit();
  let fetch: jest.Mock;
  let parentSend: jest.Mock<void, [DestinationsParentEvent]>;
  let actor: DestinationsActor;

  const apiKeyCalls = () =>
    fetch.mock.calls.filter(([endpoint]: [string]) => endpoint.includes('/destinations/api_key'));

  const fillS3 = () => {
    actor.send({ type: 'modal.openCreate' });
    actor.send({ type: 'storageKind.select', storageKind: 'external_storage' });
    actor.send({ type: 'destinationName.change', destinationName: 'S3 archive' });
    actor.send({
      type: 's3.change',
      region: 'eu-west-1',
      bucket: 'demo-bucket',
      accessKeyId: 'AKIA',
      secretAccessKey: 'shh',
    });
  };

  const fillRemote = (apiKey = REMOTE_KEY) => {
    actor.send({ type: 'modal.openCreate' });
    actor.send({ type: 'storageKind.select', storageKind: 'remote_elasticsearch' });
    actor.send({ type: 'destinationName.change', destinationName: 'Central' });
    actor.send({
      type: 'remoteElasticsearch.change',
      endpoint: 'https://es.example.com:443',
      apiKey,
    });
  };

  const failLocalMint = async () => {
    await waitFor(actor, (snapshot) => snapshot.matches({ resolvedIndices: 'ready' }));
    fetch.mockImplementationOnce(async () => {
      throw new Error('mint failed');
    });
    actor.send({ type: 'modal.openCreate' });
    actor.send({ type: 'destinationName.change', destinationName: 'Logs' });
    actor.send({ type: 'destination.create' });
    await waitFor(
      actor,
      (snapshot) =>
        snapshot.matches({ configuring: 'supplyingConfiguration' }) &&
        Boolean(snapshot.context.apiKeyError)
    );
  };

  beforeEach(() => {
    fetch = jest.fn(async (endpoint: string) =>
      endpoint.startsWith('GET /internal/streams/unit/') ? { destinations: {} } : apiKeyResponse
    );
    parentSend = jest.fn();
    const parentRef = {
      send: jest.fn(),
      _send: parentSend,
      getSnapshot: () => ({ context: {} }),
    } as unknown as AnyActorRef;
    actor = createActor(
      destinationsStateMachine.provide(
        createDestinationsMachineImplementations({
          toasts: coreMock.createStart().notifications.toasts,
          apiKeyGenerationDeps: {
            streamsRepositoryClient: { fetch },
          } as unknown as DestinationApiKeyGenerationDeps,
        })
      ),
      { input: { unitDefinition, parentRef } }
    );
    actor.start();
  });

  afterEach(() => {
    actor.stop();
  });

  it('creates an S3 destination without minting an API key and sends the secrets to the parent', () => {
    fillS3();
    actor.send({ type: 'destination.create' });
    expect(apiKeyCalls()).toEqual([]);
    expect(actor.getSnapshot().matches({ configuring: 'persisting' })).toBe(true);
    expect(parentSend).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'unit.changed',
        intent: 'create',
        destinationIds: ['s3-archive'],
        secrets: { 's3-archive-access-key-id': 'AKIA', 's3-archive-secret-access-key': 'shh' },
      })
    );
    const [[sent]] = parentSend.mock.calls;
    const node = sent.unitDefinition.unit.destinations.find(
      ({ id }: UnitDestination) => id === 's3-archive'
    );
    expect(JSON.stringify(node)).not.toContain('AKIA');
    expect(JSON.stringify(node)).not.toContain('shh');
  });

  it.each(['unit.persisted', 'unit.persistenceFailed'] as const)(
    'drops key values from context after %s',
    (type) => {
      fillS3();
      actor.send({ type: 'destination.create' });
      const [[{ unitDefinition: persisted }]] = parentSend.mock.calls;
      actor.send(
        type === 'unit.persisted'
          ? { type, destinationIds: ['s3-archive'], unitDefinition: persisted }
          : {
              type,
              destinationIds: ['s3-archive'],
              unitDefinition,
              message: 'nope',
              intent: 'create',
            }
      );
      expect(JSON.stringify(actor.getSnapshot().context)).not.toMatch(/AKIA|shh/);
    }
  );

  it('does not revoke stale Elasticsearch pending ids when an S3 persist fails after a failed mint', async () => {
    await failLocalMint();
    actor.send({ type: 'storageKind.select', storageKind: 'external_storage' });
    actor.send({ type: 'destinationName.change', destinationName: 'S3 archive' });
    actor.send({
      type: 's3.change',
      region: 'eu-west-1',
      bucket: 'demo-bucket',
      accessKeyId: 'AKIA',
      secretAccessKey: 'shh',
    });
    actor.send({ type: 'destination.create' });
    actor.send({
      type: 'unit.persistenceFailed',
      destinationIds: ['s3-archive'],
      unitDefinition,
      message: 'nope',
      intent: 'create',
    });
    expect(apiKeyCalls().filter(([endpoint]: [string]) => endpoint.startsWith('DELETE'))).toEqual(
      []
    );
  });

  it('still mints a key for a local Elasticsearch create and sends no secrets', async () => {
    actor.send({ type: 'modal.openCreate' });
    actor.send({ type: 'destinationName.change', destinationName: 'Logs' });
    actor.send({ type: 'destination.create' });
    await waitFor(actor, (snapshot) => snapshot.matches({ configuring: 'persisting' }));
    expect(apiKeyCalls().map(([endpoint]: [string]) => endpoint)).toEqual([
      'POST /internal/streams/destinations/api_key',
    ]);
    expect(parentSend).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'unit.changed', intent: 'create', secrets: undefined })
    );
  });

  describe('remote Elasticsearch', () => {
    it('creates the destination without minting an API key and sends the key only as a secret', () => {
      fillRemote(`  ${REMOTE_KEY}  `);
      actor.send({ type: 'destination.create' });
      expect(apiKeyCalls()).toEqual([]);
      expect(actor.getSnapshot().matches({ configuring: 'persisting' })).toBe(true);
      expect(parentSend).toHaveBeenCalledTimes(1);
      const [[sent]] = parentSend.mock.calls;
      expect(sent).toEqual(
        expect.objectContaining({
          type: 'unit.changed',
          intent: 'create',
          destinationIds: ['central'],
          secrets: { 'central-api-key': REMOTE_KEY },
        })
      );
      const node = sent.unitDefinition.unit.destinations?.find(
        ({ id }: UnitDestination) => id === 'central'
      );
      expect(node).toEqual(
        expect.objectContaining({
          type: REMOTE_ELASTICSEARCH_TYPE,
          config: expect.arrayContaining([
            { name: 'api_key', value: { credential: 'central-api-key' } },
          ]),
        })
      );
      expect(JSON.stringify(sent.unitDefinition)).not.toContain(REMOTE_KEY);
      expect(actor.getSnapshot().context.creationContext?.pendingDestinations).toBeUndefined();
    });

    it('validates instead of minting when the remote form is incomplete', () => {
      actor.send({ type: 'modal.openCreate' });
      actor.send({ type: 'storageKind.select', storageKind: 'remote_elasticsearch' });
      actor.send({ type: 'destinationName.change', destinationName: 'Central' });
      actor.send({ type: 'destination.create' });
      expect(apiKeyCalls()).toEqual([]);
      expect(parentSend).not.toHaveBeenCalled();
      expect(actor.getSnapshot().matches({ configuring: 'supplyingConfiguration' })).toBe(true);
      expect(actor.getSnapshot().context.creationContext?.formErrors).toEqual(
        expect.objectContaining({ endpoint: 'required', apiKey: 'required' })
      );
    });

    it('clears a failed local mint error when the remote card is selected', async () => {
      await failLocalMint();
      actor.send({ type: 'storageKind.select', storageKind: 'remote_elasticsearch' });
      expect(actor.getSnapshot().context.apiKeyError).toBeUndefined();
    });

    it('keeps a key typed on the remote card out of an S3 create', () => {
      fillRemote();
      actor.send({ type: 'storageKind.select', storageKind: 'external_storage' });
      actor.send({ type: 'destinationName.change', destinationName: 'S3 archive' });
      actor.send({
        type: 's3.change',
        region: 'eu-west-1',
        bucket: 'demo-bucket',
        accessKeyId: 'AKIA',
        secretAccessKey: 'shh',
      });
      actor.send({ type: 'destination.create' });

      expect(parentSend).toHaveBeenCalledTimes(1);
      const [[sent]] = parentSend.mock.calls;
      expect(sent.secrets).toEqual({
        's3-archive-access-key-id': 'AKIA',
        's3-archive-secret-access-key': 'shh',
      });
      expect(JSON.stringify(sent)).not.toContain(REMOTE_KEY);
    });

    it.each(['unit.persisted', 'unit.persistenceFailed'] as const)(
      'drops the key from context after %s',
      (type) => {
        fillRemote();
        actor.send({ type: 'destination.create' });
        expect(parentSend).toHaveBeenCalledTimes(1);
        const [[{ unitDefinition: persisted }]] = parentSend.mock.calls;
        actor.send(
          type === 'unit.persisted'
            ? { type, destinationIds: ['central'], unitDefinition: persisted }
            : {
                type,
                destinationIds: ['central'],
                unitDefinition,
                message: 'nope',
                intent: 'create',
              }
        );
        expect(JSON.stringify(actor.getSnapshot().context)).not.toContain(REMOTE_KEY);
      }
    );

    it('does not revoke stale Elasticsearch pending ids when a remote persist fails after a failed mint', async () => {
      await failLocalMint();
      actor.send({ type: 'storageKind.select', storageKind: 'remote_elasticsearch' });
      actor.send({ type: 'destinationName.change', destinationName: 'Central' });
      actor.send({
        type: 'remoteElasticsearch.change',
        endpoint: 'https://es.example.com:443',
        apiKey: REMOTE_KEY,
      });
      actor.send({ type: 'destination.create' });
      actor.send({
        type: 'unit.persistenceFailed',
        destinationIds: ['central'],
        unitDefinition,
        message: 'nope',
        intent: 'create',
      });
      expect(actor.getSnapshot().matches({ configuring: 'failed' })).toBe(true);
      expect(apiKeyCalls().filter(([endpoint]: [string]) => endpoint.startsWith('DELETE'))).toEqual(
        []
      );
    });
  });
});
