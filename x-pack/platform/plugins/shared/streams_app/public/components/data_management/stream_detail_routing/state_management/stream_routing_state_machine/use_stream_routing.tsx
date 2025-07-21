/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { createActorContext, useSelector } from '@xstate5/react';
import { createConsoleInspector } from '@kbn/xstate-utils';
import { waitFor } from 'xstate5';
import {
  streamRoutingMachine,
  createStreamRoutingMachineImplementations,
} from './stream_routing_state_machine';
import { StreamRoutingInput, StreamRoutingServiceDependencies } from './types';
import { RoutingDefinitionWithUIAttributes } from '../../types';
import {
  RoutingSamplesActorRef,
  RoutingSamplesActorSnapshot,
} from './routing_samples_state_machine';

const consoleInspector = createConsoleInspector();

const StreamRoutingContext = createActorContext(streamRoutingMachine);

export const useStreamsRoutingSelector = StreamRoutingContext.useSelector;

export type StreamRoutingEvents = ReturnType<typeof useStreamRoutingEvents>;

export const useStreamRoutingEvents = () => {
  const service = StreamRoutingContext.useActorRef();

  return useMemo(
    () => ({
      cancelChanges: () => {
        service.send({ type: 'routingRule.cancel' });
      },
      changeRule: (routingRule: Partial<RoutingDefinitionWithUIAttributes>) => {
        service.send({ type: 'routingRule.change', routingRule });
      },
      createNewRule: () => {
        service.send({ type: 'routingRule.create' });
      },
      removeRule: async () => {
        service.send({ type: 'routingRule.remove' });
        await waitFor(service, (snapshot) => snapshot.matches({ ready: 'idle' }));
      },
      reorderRules: (routing: RoutingDefinitionWithUIAttributes[]) => {
        service.send({ type: 'routingRule.reorder', routing });
      },
      editRule: (id: string) => {
        service.send({ type: 'routingRule.edit', id });
      },
      forkStream: () => {
        service.send({ type: 'routingRule.fork' });
      },
      saveChanges: () => {
        service.send({ type: 'routingRule.save' });
      },
    }),
    [service]
  );
};

export const StreamRoutingContextProvider = ({
  children,
  definition,
  ...deps
}: React.PropsWithChildren<StreamRoutingServiceDependencies & StreamRoutingInput>) => {
  return (
    <StreamRoutingContext.Provider
      logic={streamRoutingMachine.provide(createStreamRoutingMachineImplementations(deps))}
      options={{
        id: 'streamRouting',
        inspect: consoleInspector,
        input: {
          definition,
        },
      }}
    >
      <ListenForDefinitionChanges definition={definition}>{children}</ListenForDefinitionChanges>
    </StreamRoutingContext.Provider>
  );
};

const ListenForDefinitionChanges = ({
  children,
  definition,
}: React.PropsWithChildren<StreamRoutingInput>) => {
  const service = StreamRoutingContext.useActorRef();

  useEffect(() => {
    service.send({ type: 'stream.received', definition });
  }, [definition, service]);

  return children;
};

export const useStreamSamplesRef = () => {
  return useStreamsRoutingSelector(
    (state) => state.children.routingSamplesMachine as RoutingSamplesActorRef | undefined
  );
};

export const useStreamSamplesSelector = <T,>(
  selector: (snapshot: RoutingSamplesActorSnapshot) => T
): T => {
  const routingSamplesRef = useStreamSamplesRef();

  if (!routingSamplesRef) {
    throw new Error(
      'useStreamSamplesSelector must be used within a StreamEnrichmentContextProvider'
    );
  }

  return useSelector(routingSamplesRef, selector);
};
