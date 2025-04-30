/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { createActorContext, useSelector } from '@xstate5/react';
import { createConsoleInspector } from '@kbn/xstate-utils';
import { QueryState } from '@kbn/data-plugin/common';
import {
  streamEnrichmentMachine,
  createStreamEnrichmentMachineImplementations,
} from './stream_enrichment_state_machine';
import { StreamEnrichmentInput, StreamEnrichmentServiceDependencies } from './types';
import { ProcessorDefinitionWithUIAttributes } from '../../types';
import { ProcessorActorRef } from '../processor_state_machine';
import {
  PreviewDocsFilterOption,
  SimulationActorSnapshot,
  SimulationSearchParams,
} from '../simulation_state_machine';
import { MappedSchemaField, SchemaField } from '../../../schema_editor/types';

const consoleInspector = createConsoleInspector();

const StreamEnrichmentContext = createActorContext(streamEnrichmentMachine);

export const useStreamsEnrichmentSelector = StreamEnrichmentContext.useSelector;

export type StreamEnrichmentEvents = ReturnType<typeof useStreamEnrichmentEvents>;

export const useGetStreamEnrichmentState = () => {
  const service = StreamEnrichmentContext.useActorRef();
  return useCallback(() => service.getSnapshot(), [service]);
};

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
      changeSearchParams: (search: Partial<SimulationSearchParams>) => {
        service.send({ type: 'simulation.changeSearchParams', search });
      },
      mapField: (field: SchemaField) => {
        service.send({ type: 'simulation.fields.map', field: field as MappedSchemaField });
      },
      unmapField: (fieldName: string) => {
        service.send({ type: 'simulation.fields.unmap', fieldName });
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
