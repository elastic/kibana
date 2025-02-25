/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { createActorContext, useSelector } from '@xstate5/react';
import { createConsoleInspector } from '@kbn/xstate-utils';
import { SnapshotFrom } from 'xstate5';
import {
  streamEnrichmentMachine,
  createStreamEnrichmentMachineImplementations,
} from './stream_enrichment_state_machine';
import {
  StreamEnrichmentEventParams,
  StreamEnrichmentInput,
  StreamEnrichmentServiceDependencies,
} from './types';
import { simulationMachine } from './simulation_state_machine';

const consoleInspector = createConsoleInspector();

const StreamEnrichmentContext = createActorContext(streamEnrichmentMachine);

export const useStreamsEnrichmentSelector = StreamEnrichmentContext.useSelector;

export type StreamEnrichmentEvents = ReturnType<typeof useStreamEnrichmentEvents>;

export const useStreamEnrichmentEvents = () => {
  const service = StreamEnrichmentContext.useActorRef();

  return useMemo(
    () => ({
      addProcessor: (processor: StreamEnrichmentEventParams<'processors.add'>['processor']) => {
        service.send({ type: 'processors.add', processor });
      },
      reorderProcessors: (
        processorsRefs: StreamEnrichmentEventParams<'processors.reorder'>['processorsRefs']
      ) => {
        service.send({ type: 'processors.reorder', processorsRefs });
      },
      resetChanges: () => {
        service.send({ type: 'stream.reset' });
      },
      saveChanges: () => {
        service.send({ type: 'stream.update' });
      },
      viewSimulationPreviewData: () => {
        service.send({ type: 'simulation.viewDataPreview' });
      },
      viewSimulationDetectedFields: () => {
        service.send({ type: 'simulation.viewDetectedFields' });
      },
    }),
    [service]
  );
};

export const StreamEnrichmentContextProvider = ({
  children,
  definition,
  ...deps
}: React.PropsWithChildren<StreamEnrichmentServiceDependencies & StreamEnrichmentInput>) => {
  return (
    <StreamEnrichmentContext.Provider
      logic={streamEnrichmentMachine.provide(createStreamEnrichmentMachineImplementations(deps))}
      options={{
        inspect: consoleInspector,
        input: {
          definition,
        },
      }}
    >
      <ListenForDefinitionChanges definition={definition}>{children}</ListenForDefinitionChanges>
    </StreamEnrichmentContext.Provider>
  );
};

const ListenForDefinitionChanges = ({
  children,
  definition,
}: React.PropsWithChildren<StreamEnrichmentInput>) => {
  const service = StreamEnrichmentContext.useActorRef();

  useEffect(() => {
    service.send({ type: 'stream.received', definition });
  }, [definition, service]);

  return children;
};

export const useSimulatorSelector = <T,>(
  selector: (snapshot: SnapshotFrom<typeof simulationMachine> | undefined) => T
): T => {
  const simulationRef = useStreamsEnrichmentSelector((state) => state.context.simulatorRef);
  return useSelector(simulationRef, selector);
};
