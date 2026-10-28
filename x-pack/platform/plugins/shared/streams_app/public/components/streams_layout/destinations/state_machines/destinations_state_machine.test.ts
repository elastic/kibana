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
import type { UnitDestination } from '@kbn/streams-schema';
import { EMPTY_DESTINATION_CREATION_FORM, type DestinationCreationFormData } from '../types';
import {
  createDestinationsMachineImplementations,
  destinationsStateMachine,
  getDestinationViewModels,
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

  const s3FormData: DestinationCreationFormData = {
    ...EMPTY_DESTINATION_CREATION_FORM,
    storageKind: 'external_storage',
    destinationName: 'S3 archive',
    s3: {
      region: 'eu-west-1',
      bucket: 'demo-bucket',
      prefix: '',
      accessKeyId: 'AKIA',
      secretAccessKey: 'shh',
    },
  };

  const createS3Destination = () => {
    actor.send({ type: 'modal.openCreate' });
    actor.send({ type: 'destination.create', formData: s3FormData });
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

  it('ignores an invalid form', () => {
    actor.send({ type: 'modal.openCreate' });
    actor.send({ type: 'destination.create', formData: EMPTY_DESTINATION_CREATION_FORM });

    expect(actor.getSnapshot().matches({ configuring: 'supplyingConfiguration' })).toBe(true);
    expect(actor.getSnapshot().context.creationContext).toBeUndefined();
    expect(parentSend).not.toHaveBeenCalled();
  });

  it('keeps the context when stats are requested again for a destination', () => {
    const timeRange = { start: 0, end: 1000 };
    actor.send({ type: 'indexStats.request', destinationId: 'es-1', timeRange });
    const { context } = actor.getSnapshot();
    const detailRef = context.destinationDetailRefs['es-1'];

    actor.send({ type: 'indexStats.request', destinationId: 'es-1', timeRange });

    expect(detailRef).toBeDefined();
    expect(actor.getSnapshot().context).toBe(context);
    expect(getDestinationViewModels(actor.getSnapshot().context)).toBe(
      getDestinationViewModels(context)
    );
  });

  it('keeps the destination view models when unrelated context changes', () => {
    const before = getDestinationViewModels(actor.getSnapshot().context);

    actor.send({ type: 'modal.openCreate' });
    actor.send({ type: 'flyout.close' });

    expect(getDestinationViewModels(actor.getSnapshot().context)).toBe(before);
  });

  it('resolves indices once after a subsequent unit load and passes an abort signal', async () => {
    await waitFor(actor, (snapshot) => snapshot.matches({ resolvedIndices: 'ready' }));
    actor.send({ type: 'unit.loaded', unitDefinition });
    fetch.mockClear();

    actor.send({ type: 'unit.loaded', unitDefinition });
    await waitFor(actor, (snapshot) => snapshot.matches({ resolvedIndices: 'ready' }));

    const resolveCalls = fetch.mock.calls.filter(([endpoint]: [string]) =>
      endpoint.includes('/_resolve_indices')
    );
    expect(resolveCalls).toHaveLength(1);
    expect(resolveCalls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it('clears resolved indices while refreshing', async () => {
    await waitFor(actor, (snapshot) => snapshot.matches({ resolvedIndices: 'ready' }));
    fetch.mockResolvedValueOnce({
      destinations: {
        'es-1': { indices: [{ name: 'logs-old', is_data_stream: false }] },
      },
    });
    actor.send({ type: 'resolvedIndices.reload' });
    await waitFor(
      actor,
      (snapshot) => snapshot.context.resolvedIndicesByDestination['es-1'] !== undefined
    );

    fetch.mockResolvedValueOnce({ destinations: {} });
    actor.send({ type: 'resolvedIndices.reload' });

    expect(actor.getSnapshot().context.resolvedIndicesByDestination).toEqual({});
    await waitFor(actor, (snapshot) => snapshot.matches({ resolvedIndices: 'ready' }));
  });

  it('creates an S3 destination without minting an API key and sends the secrets to the parent', () => {
    createS3Destination();
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
      createS3Destination();
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
    actor.send({
      type: 'destination.create',
      formData: { ...EMPTY_DESTINATION_CREATION_FORM, destinationName: 'Logs' },
    });
    await waitFor(
      actor,
      (snapshot) =>
        snapshot.matches({ configuring: 'supplyingConfiguration' }) &&
        Boolean(snapshot.context.apiKeyError)
    );
    actor.send({ type: 'destination.create', formData: s3FormData });
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
