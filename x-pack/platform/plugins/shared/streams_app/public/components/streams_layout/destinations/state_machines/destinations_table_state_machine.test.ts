/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { createActor, waitFor, type Actor } from 'xstate';
import { createDefaultUnit } from '../../../../services/unit_repository';
import type { DestinationApiKeyGenerationDeps } from '../destination_api_keys';
import { destinationsTableStateMachine } from './destinations_table_state_machine';

type TableActor = Actor<typeof destinationsTableStateMachine>;

const waitForReady = (actor: TableActor) => waitFor(actor, (snapshot) => snapshot.matches('ready'));

describe('destinationsTableStateMachine', () => {
  const unit = createDefaultUnit();
  let actor: TableActor;
  let load: jest.Mock;
  let persist: jest.Mock;

  beforeEach(async () => {
    const fetch = jest.fn(async (endpoint: string) =>
      endpoint.startsWith('GET /internal/streams/unit/') ? { destinations: {} } : {}
    );
    load = jest.fn().mockResolvedValue(unit);
    persist = jest.fn(async (unitDefinition) => unitDefinition);
    actor = createActor(destinationsTableStateMachine, {
      input: {
        toasts: coreMock.createStart().notifications.toasts,
        apiKeyGenerationDeps: {
          streamsRepositoryClient: { fetch },
        } as unknown as DestinationApiKeyGenerationDeps,
        loadUnitDefinition: load,
        persistUnitDefinition: persist,
      },
    });
    actor.start();
    await waitForReady(actor);
  });

  afterEach(() => {
    actor.stop();
  });

  it('passes event secrets to persist and clears them after', async () => {
    actor.send({
      type: 'unit.changed',
      unitDefinition: unit,
      destinationIds: ['s3-archive'],
      intent: 'create',
      secrets: { 's3-archive-access-key-id': 'AKIA' },
    });
    await waitForReady(actor);
    expect(persist).toHaveBeenCalledWith(unit, { 's3-archive-access-key-id': 'AKIA' });
    expect(actor.getSnapshot().context.pendingSecrets).toBeUndefined();
  });

  it('clears pending secrets when persist fails without storing an error for a failed create', async () => {
    persist.mockRejectedValueOnce(new Error('boom'));
    actor.send({
      type: 'unit.changed',
      unitDefinition: unit,
      destinationIds: ['s3-archive'],
      intent: 'create',
      secrets: { 'x-secret-access-key': 'y' },
    });
    await waitFor(actor, (snapshot) => snapshot.matches('failed'));
    expect(actor.getSnapshot().context.pendingSecrets).toBeUndefined();
    expect(actor.getSnapshot().context.error).toBeUndefined();
  });

  it('stores the error when a reload after a failed create fails', async () => {
    persist.mockRejectedValueOnce(new Error('boom'));
    actor.send({
      type: 'unit.changed',
      unitDefinition: unit,
      destinationIds: ['s3-archive'],
      intent: 'create',
    });
    await waitFor(actor, (snapshot) => snapshot.matches('failed'));
    load.mockRejectedValueOnce(new Error('offline'));
    actor.send({ type: 'unit.reload' });
    await waitFor(
      actor,
      (snapshot) => snapshot.matches('failed') && snapshot.context.error?.message === 'offline'
    );
  });
});
