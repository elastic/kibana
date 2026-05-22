/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createActor, fromEventObservable, fromObservable } from 'xstate';
import type { Observable } from 'rxjs';
import { EMPTY, of } from 'rxjs';
import { ALWAYS_CONDITION } from '@kbn/streamlang';
import { isSchema, routingDefinitionListSchema } from '@kbn/streams-schema';
import type { SampleDocument, Streams } from '@kbn/streams-schema';
import { streamRoutingMachine } from './stream_routing_state_machine';
import {
  routingSamplesMachine,
  buildDocumentCountProbabilitySearchParams,
} from './routing_samples_state_machine';
import type { RoutingSamplesInput } from './routing_samples_state_machine';
import { routingConverter } from '../../utils';

const stubRoutingSamplesMachine = routingSamplesMachine.provide({
  actors: {
    collectDocuments: fromObservable<
      SampleDocument[],
      Pick<RoutingSamplesInput, 'condition' | 'definition' | 'documentMatchFilter'>
    >(() => of([])),
    collectDocumentsCount: fromObservable<
      number | null | undefined,
      Pick<RoutingSamplesInput, 'condition' | 'definition' | 'documentMatchFilter'>
    >(() => of(undefined)),
    subscribeTimeUpdates: fromEventObservable(
      () => EMPTY as unknown as Observable<{ type: string }>
    ),
  },
});

describe('streamRoutingMachine condition editor validity', () => {
  it('disables routing updates when the condition editor is invalid JSON', async () => {
    const definition = {
      privileges: { manage: true, simulate: true },
      inherited_fields: {},
      stream: {
        name: 'logs.otel',
        ingest: {
          wired: {
            fields: {},
            routing: [
              {
                destination: 'logs.otel.child',
                where: ALWAYS_CONDITION,
                status: 'enabled',
              },
            ],
          },
        },
      },
    } as unknown as Streams.WiredStream.GetResponse;

    const actor = createActor(
      streamRoutingMachine.provide({
        actors: {
          routingSamplesMachine: stubRoutingSamplesMachine,
        },
      }),
      { input: { definition } }
    );

    actor.start();

    const initialSnapshot = actor.getSnapshot();
    expect(initialSnapshot.value).toEqual({ ready: { ingestMode: 'idle' } });
    const firstRuleId = initialSnapshot.context.routing[0].id;

    expect(actor.getSnapshot().can({ type: 'routingRule.edit', id: firstRuleId })).toBe(true);
    actor.send({ type: 'routingRule.edit', id: firstRuleId });
    await Promise.resolve();
    expect(actor.getSnapshot().context.currentRuleId).toBe(firstRuleId);

    // Ensure there is an actual change, otherwise saving may legitimately be disabled
    actor.send({
      type: 'routingRule.change',
      routingRule: {
        where: { field: 'service.name', eq: 'updated-service' },
      },
    });
    await Promise.resolve();
    const def = actor.getSnapshot().context.definition;
    expect('privileges' in def ? def.privileges.manage : true).toBe(true);
    expect(actor.getSnapshot().context.isConditionEditorValid).toBe(true);
    expect(
      isSchema(
        routingDefinitionListSchema,
        actor.getSnapshot().context.routing.map(routingConverter.toAPIDefinition)
      )
    ).toBe(true);

    expect(actor.getSnapshot().value).toEqual({
      ready: { ingestMode: { editingRule: 'changing' } },
    });

    expect(actor.getSnapshot().can({ type: 'routingRule.save' })).toBe(true);

    actor.send({ type: 'routingRule.setConditionEditorValidity', isValid: false });
    await Promise.resolve();
    expect(actor.getSnapshot().can({ type: 'routingRule.save' })).toBe(false);

    actor.send({ type: 'routingRule.setConditionEditorValidity', isValid: true });
    await Promise.resolve();
    expect(actor.getSnapshot().can({ type: 'routingRule.save' })).toBe(true);
  });
});

const classicDefinition = {
  privileges: { manage: true, simulate: true, read_failure_store: true },
  stream: {
    name: 'logs-generic-default',
    type: 'classic',
    ingest: {
      classic: {},
    },
    query_streams: [],
  },
  data_stream_exists: true,
  effective_lifecycle: { type: 'dlm', data_retention: '30d' },
  effective_failure_store: { enabled: false },
  effective_settings: {},
} as unknown as Streams.ClassicStream.GetResponse;

describe('classic stream partitioning', () => {
  const createClassicActor = () => {
    const actor = createActor(
      streamRoutingMachine.provide({
        actors: {
          routingSamplesMachine: stubRoutingSamplesMachine,
        },
      }),
      { input: { definition: classicDefinition } }
    );
    actor.start();
    return actor;
  };

  it('starts directly in queryMode for classic streams', () => {
    const actor = createClassicActor();
    expect(actor.getSnapshot().value).toEqual({ ready: { queryMode: 'idle' } });
  });

  it('blocks changeToIngestMode for a classic stream', () => {
    const actor = createClassicActor();

    actor.send({ type: 'childStreams.mode.changeToIngestMode' });

    expect(actor.getSnapshot().value).toEqual({ ready: { queryMode: 'idle' } });
  });

  it('has empty routing for a classic stream', () => {
    const actor = createClassicActor();

    expect(actor.getSnapshot().context.routing).toEqual([]);
    expect(actor.getSnapshot().context.initialRouting).toEqual([]);
  });

  it('stays in queryMode after stream.received for a classic stream', async () => {
    const actor = createClassicActor();
    expect(actor.getSnapshot().value).toEqual({ ready: { queryMode: 'idle' } });

    actor.send({ type: 'stream.received', definition: classicDefinition });
    await Promise.resolve();

    expect(actor.getSnapshot().value).toEqual({ ready: { queryMode: 'idle' } });
  });
});

describe('wired stream mode switching', () => {
  const wiredDefinition = {
    privileges: { manage: true, simulate: true },
    inherited_fields: {},
    stream: {
      name: 'logs.otel',
      ingest: {
        wired: {
          fields: {},
          routing: [],
        },
      },
    },
  } as unknown as Streams.WiredStream.GetResponse;

  const createWiredActor = () => {
    const actor = createActor(
      streamRoutingMachine.provide({
        actors: {
          routingSamplesMachine: stubRoutingSamplesMachine,
        },
      }),
      { input: { definition: wiredDefinition } }
    );
    actor.start();
    return actor;
  };

  it('allows wired streams to switch from queryMode back to ingestMode', () => {
    const actor = createWiredActor();
    expect(actor.getSnapshot().value).toEqual({ ready: { ingestMode: 'idle' } });

    actor.send({ type: 'childStreams.mode.changeToQueryMode' });
    expect(actor.getSnapshot().value).toEqual({ ready: { queryMode: 'idle' } });

    actor.send({ type: 'childStreams.mode.changeToIngestMode' });
    expect(actor.getSnapshot().value).toEqual({ ready: { ingestMode: 'idle' } });
  });
});

describe('getRuntimeMappings classic stream guard', () => {
  it('returns empty runtime_mappings for classic definitions even with a condition', () => {
    const result = buildDocumentCountProbabilitySearchParams({
      condition: { field: 'service.name', eq: 'my-service' },
      definition: classicDefinition,
      start: Date.parse('2026-01-01T00:00:00.000Z'),
      end: Date.parse('2026-01-02T00:00:00.000Z'),
      docCount: 1000,
    });

    expect(result.runtime_mappings).toEqual({});
  });

  it('returns runtime_mappings for wired definitions with unmapped fields', () => {
    const wiredDefinition = {
      privileges: { manage: true, simulate: true },
      inherited_fields: {},
      stream: {
        name: 'logs.otel',
        ingest: {
          wired: {
            fields: {},
            routing: [],
          },
        },
      },
    } as unknown as Streams.WiredStream.GetResponse;

    const result = buildDocumentCountProbabilitySearchParams({
      condition: { field: 'service.name', eq: 'my-service' },
      definition: wiredDefinition,
      start: Date.parse('2026-01-01T00:00:00.000Z'),
      end: Date.parse('2026-01-02T00:00:00.000Z'),
      docCount: 1000,
    });

    expect(result.runtime_mappings).toEqual({
      'service.name': { type: 'keyword' },
    });
  });
});
