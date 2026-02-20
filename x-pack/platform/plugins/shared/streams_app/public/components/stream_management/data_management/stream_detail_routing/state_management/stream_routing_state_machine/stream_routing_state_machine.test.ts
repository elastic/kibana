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
import { routingSamplesMachine } from './routing_samples_state_machine';
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
        name: 'logs',
        ingest: {
          wired: {
            fields: {},
            routing: [
              {
                destination: 'logs.child',
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
    expect(actor.getSnapshot().context.definition.privileges.manage).toBe(true);
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
