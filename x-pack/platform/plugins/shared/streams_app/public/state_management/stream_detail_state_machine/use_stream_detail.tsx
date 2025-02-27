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
  createStreamDetailMachineImplementations,
  streamDetailMachine,
} from './stream_detail_state_machine';
import { StreamDetailInput, StreamDetailServiceDependencies } from './types';

const consoleInspector = createConsoleInspector();

const StreamDetailContext = createActorContext(streamDetailMachine);

export const useStreamDetailActorRef = StreamDetailContext.useActorRef;
export const useStreamDetailSelector = StreamDetailContext.useSelector;

export type StreamDetailEvents = ReturnType<typeof useStreamDetailEvents>;

export const useStreamDetailEvents = () => {
  const actorRef = useStreamDetailActorRef();

  return useMemo(
    () => ({
      reload: () => {
        actorRef.send({ type: 'definition.reload' });
      },
    }),
    [actorRef]
  );
};

export const StreamDetailContextProvider = ({
  children,
  name,
  ...deps
}: React.PropsWithChildren<StreamDetailServiceDependencies & StreamDetailInput>) => {
  return (
    <StreamDetailContext.Provider
      logic={streamDetailMachine.provide(createStreamDetailMachineImplementations(deps))}
      options={{
        inspect: consoleInspector,
        input: {
          name,
        },
      }}
    >
      <ListenForNameChanges name={name}>{children}</ListenForNameChanges>
    </StreamDetailContext.Provider>
  );
};

const ListenForNameChanges = ({ children, name }: React.PropsWithChildren<StreamDetailInput>) => {
  const actorRef = useStreamDetailActorRef();

  useEffect(() => {
    actorRef.send({ type: 'definition.updateName', name });
  }, [name, actorRef]);

  return children;
};
