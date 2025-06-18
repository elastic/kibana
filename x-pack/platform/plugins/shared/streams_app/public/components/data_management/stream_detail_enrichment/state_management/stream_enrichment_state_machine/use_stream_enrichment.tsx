/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { createActorContext, useSelector } from '@xstate5/react';
import { createConsoleInspector } from '@kbn/xstate-utils';
import { EnrichmentDataSource } from '../../../../../../common/url_schema';
import {
  streamEnrichmentMachine,
  createStreamEnrichmentMachineImplementations,
} from './stream_enrichment_state_machine';
import { StreamEnrichmentInput, StreamEnrichmentServiceDependencies } from './types';
import { ProcessorDefinitionWithUIAttributes } from '../../types';
import { ProcessorActorRef } from '../processor_state_machine';
import { PreviewDocsFilterOption, SimulationActorSnapshot } from '../simulation_state_machine';
import { MappedSchemaField, SchemaField } from '../../../schema_editor/types';
import { isGrokProcessor } from '../../utils';

const consoleInspector = createConsoleInspector();

const StreamEnrichmentContext = createActorContext(streamEnrichmentMachine);

export const useStreamEnrichmentSelector = StreamEnrichmentContext.useSelector;

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
      refreshSimulation: () => {
        service.send({ type: 'simulation.refresh' });
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
      mapField: (field: SchemaField) => {
        service.send({ type: 'simulation.fields.map', field: field as MappedSchemaField });
      },
      unmapField: (fieldName: string) => {
        service.send({ type: 'simulation.fields.unmap', fieldName });
      },
      openDataSourcesManagement: () => {
        service.send({ type: 'dataSources.openManagement' });
      },
      closeDataSourcesManagement: () => {
        service.send({ type: 'dataSources.closeManagement' });
      },
      addDataSource: (dataSource: EnrichmentDataSource) => {
        service.send({ type: 'dataSources.add', dataSource });
      },
      setExplicitlyEnabledPreviewColumns: (columns: string[]) => {
        service.send({
          type: 'previewColumns.updateExplicitlyEnabledColumns',
          columns: columns.filter((col) => col.trim() !== ''),
        });
      },
      setExplicitlyDisabledPreviewColumns: (columns: string[]) => {
        service.send({
          type: 'previewColumns.updateExplicitlyDisabledColumns',
          columns: columns.filter((col) => col.trim() !== ''),
        });
      },
      setPreviewColumnsOrder: (columns: string[]) => {
        service.send({
          type: 'previewColumns.order',
          columns: columns.filter((col) => col.trim() !== ''),
        });
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
      <StreamEnrichmentCleanupOnUnmount />
      <ListenForDefinitionChanges definition={definition}>{children}</ListenForDefinitionChanges>
    </StreamEnrichmentContext.Provider>
  );
};

/* Grok resources are not directly modeled by Xstate (they are not first class machines or actors etc) */
const StreamEnrichmentCleanupOnUnmount = () => {
  const service = StreamEnrichmentContext.useActorRef();

  useEffect(() => {
    return () => {
      const context = service.getSnapshot().context;
      context.processorsRefs.forEach((procRef) => {
        const procContext = procRef.getSnapshot().context;
        if (isGrokProcessor(procContext.processor)) {
          const draftGrokExpressions = procContext.resources?.grokExpressions ?? [];
          draftGrokExpressions.forEach((expression) => {
            expression.destroy();
          });
        }
      });
    };
  }, [service]);

  return null;
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
  return useStreamEnrichmentSelector((state) => state.context.simulatorRef);
};

export const useSimulatorSelector = <T,>(selector: (snapshot: SimulationActorSnapshot) => T): T => {
  const simulationRef = useSimulatorRef();

  if (!simulationRef) {
    throw new Error('useSimulatorSelector must be used within a StreamEnrichmentContextProvider');
  }

  return useSelector(simulationRef, selector);
};
