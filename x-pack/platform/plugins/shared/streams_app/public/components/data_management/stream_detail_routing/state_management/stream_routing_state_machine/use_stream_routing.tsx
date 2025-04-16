/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { createActorContext } from '@xstate5/react';
import { createConsoleInspector } from '@kbn/xstate-utils';
import {
  streamRoutingMachine,
  createStreamRoutingMachineImplementations,
} from './stream_routing_state_machine';
import { StreamRoutingInput, StreamRoutingServiceDependencies } from './types';

const consoleInspector = createConsoleInspector();

const StreamRoutingContext = createActorContext(streamRoutingMachine);

export const useStreamsRoutingSelector = StreamRoutingContext.useSelector;

export type StreamRoutingEvents = ReturnType<typeof useStreamRoutingEvents>;

export const useStreamRoutingEvents = () => {
  const service = StreamRoutingContext.useActorRef();

  return useMemo(
    () => ({
      resetChanges: () => {
        service.send({ type: 'stream.reset' });
      },
      saveChanges: () => {
        service.send({ type: 'stream.update' });
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
