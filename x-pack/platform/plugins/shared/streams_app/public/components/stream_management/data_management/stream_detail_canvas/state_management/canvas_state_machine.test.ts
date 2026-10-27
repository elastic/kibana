/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { createActor, createMachine, waitFor, type Actor, type SnapshotFrom } from 'xstate';
import { createDefaultUnit, type Unit } from '../../../../../services/unit_repository';
import {
  withUnitDestinations,
  type UnitDestination,
} from '../../../../streams_layout/destinations/destination_models';
import { canvasStateMachine, createCanvasMachineImplementations } from './canvas_state_machine';
import type { destinationsStateMachine } from '../../../../streams_layout/destinations/state_machines/destinations_state_machine';
import type { DestinationApiKeyGenerationDeps } from '../../../../streams_layout/destinations/destination_api_keys';
import type { sourcesStateMachine } from '../../../../streams_layout/sources/state_machines/sources_state_machine';
import { defaultCanvasUrlState } from './types';

type CanvasActor = Actor<typeof canvasStateMachine>;
type CanvasSnapshot = SnapshotFrom<typeof canvasStateMachine>;

const ready = (snapshot: CanvasSnapshot) => snapshot.matches({ ready: { unit: 'ready' } });
const failed = (snapshot: CanvasSnapshot) => snapshot.matches({ ready: { unit: 'saveFailed' } });

const s3Node: UnitDestination = {
  id: 's3-archive',
  name: 'S3 archive',
  type: 's3',
  supported_telemetry: ['logs'],
  config: [],
};

describe('canvasStateMachine', () => {
  const unit = createDefaultUnit();
  const unitWithS3 = withUnitDestinations(unit, [s3Node]);
  const secrets = { 's3-archive-secret-access-key': 'shh' };
  let core: ReturnType<typeof coreMock.createStart>;
  let persist: jest.Mock;
  let load: jest.Mock;
  let actor: CanvasActor;

  beforeEach(async () => {
    core = coreMock.createStart();
    persist = jest.fn(async (unitDefinition: Unit) => unitDefinition);
    load = jest.fn(async () => unit);
    const implementations = createCanvasMachineImplementations({
      core,
      urlStateStorageContainer: {
        get: () => undefined,
        set: jest.fn(),
      } as unknown as IKbnUrlStateStorage,
      apiKeyGenerationDeps: {
        streamsRepositoryClient: { fetch: jest.fn() },
      } as unknown as DestinationApiKeyGenerationDeps,
      loadUnitDefinition: load,
      persistUnitDefinition: persist,
      createHistoryRef: { current: { hold: jest.fn(), reset: jest.fn(), discard: jest.fn() } },
    });
    const idle = createMachine({ initial: 'idle', states: { idle: {} } });
    actor = createActor(
      canvasStateMachine.provide({
        ...implementations,
        actors: {
          ...implementations.actors,
          sourcesMachine: idle as unknown as typeof sourcesStateMachine,
          destinationsMachine: idle as unknown as typeof destinationsStateMachine,
        },
      }),
      { input: defaultCanvasUrlState }
    );
    actor.start();
    await waitFor(actor, ready);
  });

  afterEach(() => {
    actor.stop();
  });

  it('persists a destination create with its secrets and then forgets them', async () => {
    actor.send({
      type: 'unit.changed',
      unitDefinition: unitWithS3,
      destinationIds: ['s3-archive'],
      intent: 'create',
      secrets,
    });
    await waitFor(actor, ready);
    expect(persist).toHaveBeenCalledWith(unitWithS3, secrets);
    expect(JSON.stringify(actor.getSnapshot().context)).not.toContain('shh');
  });

  it('forgets the secrets when persistence fails', async () => {
    persist.mockRejectedValueOnce(new Error('boom'));
    actor.send({
      type: 'unit.changed',
      unitDefinition: unitWithS3,
      destinationIds: ['s3-archive'],
      intent: 'create',
      secrets,
    });
    await waitFor(actor, failed);
    expect(JSON.stringify(actor.getSnapshot().context)).not.toContain('shh');
  });

  it('sends no secrets on a later plain save', async () => {
    actor.send({
      type: 'unit.changed',
      unitDefinition: unitWithS3,
      destinationIds: ['s3-archive'],
      intent: 'create',
      secrets,
    });
    await waitFor(actor, ready);
    const stagedUnit: Unit = {
      ...unitWithS3,
      ui_metadata: { nodes: { 's3-archive': { x: 1, y: 2 } } },
    };
    actor.send({ type: 'unit.stage', unitDefinition: stagedUnit });
    actor.send({ type: 'unit.save' });
    await waitFor(actor, ready);
    expect(persist).toHaveBeenLastCalledWith(stagedUnit, undefined);
  });

  it('does not toast a failed destination create but still toasts a failed reload after it', async () => {
    persist.mockRejectedValueOnce(new Error('boom'));
    actor.send({
      type: 'unit.changed',
      unitDefinition: unitWithS3,
      destinationIds: ['s3-archive'],
      intent: 'create',
      secrets,
    });
    await waitFor(actor, failed);
    expect(core.notifications.toasts.addError).not.toHaveBeenCalled();
    load.mockRejectedValueOnce(new Error('offline'));
    actor.send({ type: 'unit.reload' });
    await waitFor(actor, (snapshot) => snapshot.matches({ ready: { unit: 'reloadFailed' } }));
    expect(core.notifications.toasts.addError).toHaveBeenCalledTimes(1);
  });
});
