/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { createActorContext, useSelector } from '@xstate5/react';
import { createConsoleInspector, withMemoizedSelectors } from '@kbn/xstate-utils';
import { createSelector } from 'reselect';
import {
  streamEnrichmentMachine,
  createStreamEnrichmentMachineImplementations,
} from './stream_enrichment_state_machine';
import {
  StreamEnrichmentContextType,
  StreamEnrichmentInput,
  StreamEnrichmentServiceDependencies,
} from './types';
import { ProcessorDefinitionWithUIAttributes } from '../../types';
import { ProcessorActorRef } from '../processor_state_machine';
import {
  PreviewDocsFilterOption,
  SimulationActorSnapshot,
  filterSimulationDocuments,
} from '../simulation_state_machine';

const consoleInspector = createConsoleInspector();

const StreamEnrichmentContext = withMemoizedSelectors(
  createActorContext(streamEnrichmentMachine),
  {
    derivedSamples: createSelector(
      [
        (ctx: StreamEnrichmentContextType) => {
          return ctx.simulatorRef?.getSnapshot().context.samples;
        },
        (ctx: StreamEnrichmentContextType) =>
          ctx.simulatorRef?.getSnapshot().context.previewDocsFilter,
        (ctx: StreamEnrichmentContextType) =>
          ctx.simulatorRef?.getSnapshot().context.simulation?.documents,
      ],
      (samples, previewDocsFilter, documents) => {
        return (
          (previewDocsFilter && documents
            ? filterSimulationDocuments(documents, previewDocsFilter)
            : samples) || []
        );
      }
    ),
  },
  (context) => (context.simulatorRef ? [context.simulatorRef] : [])
);

export const useStreamsEnrichmentSelector = StreamEnrichmentContext.useSelector;
export const useStreamsEnrichmentMemoizedSelector = StreamEnrichmentContext.useMemoizedSelector;

export type StreamEnrichmentEvents = ReturnType<typeof useStreamEnrichmentEvents>;

export const useStreamEnrichmentEvents = () => {
  const service = StreamEnrichmentContext.useActorRef();

  return useMemo(
    () => ({
      addProcessor: (processor: ProcessorDefinitionWithUIAttributes) => {
        service.send({ type: 'processors.add', processor });
      },
      reorderProcessors: (processorsRefs: ProcessorActorRef[]) => {
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
      changePreviewDocsFilter: (filter: PreviewDocsFilterOption) => {
        service.send({ type: 'simulation.changePreviewDocsFilter', filter });
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
        id: 'streamEnrichment',
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

export const useSimulatorRef = () => {
  return useStreamsEnrichmentSelector((state) => state.context.simulatorRef);
};

export const useSimulatorSelector = <T,>(selector: (snapshot: SimulationActorSnapshot) => T): T => {
  const simulationRef = useSimulatorRef();

  if (!simulationRef) {
    throw new Error('useSimulatorSelector must be used within a StreamEnrichmentContextProvider');
  }

  return useSelector(simulationRef, selector);
};
