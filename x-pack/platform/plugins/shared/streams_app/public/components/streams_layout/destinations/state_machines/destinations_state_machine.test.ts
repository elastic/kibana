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
import {
  createDestinationsMachineImplementations,
  destinationsStateMachine,
  type DestinationsParentEvent,
} from './destinations_state_machine';

type DestinationsActor = Actor<typeof destinationsStateMachine>;

const apiKeyResponse = { id: 'k', name: 'k', createdAt: 'now', encodedApiKey: 'enc' };

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
});
