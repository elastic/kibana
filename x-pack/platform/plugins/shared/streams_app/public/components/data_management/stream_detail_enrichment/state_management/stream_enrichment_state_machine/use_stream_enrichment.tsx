/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { createActorContext, useSelector } from '@xstate/react';
import { createConsoleInspector } from '@kbn/xstate-utils';
import type {
  StreamlangProcessorDefinition,
  StreamlangStepWithUIAttributes,
  StreamlangDSL,
  StreamlangConditionBlock,
} from '@kbn/streamlang';
import { GrokCollection, GrokCollectionProvider } from '@kbn/grok-ui';
import type { Streams } from '@kbn/streams-schema';
import type { EnrichmentDataSource } from '../../../../../../common/url_schema';
import {
  streamEnrichmentMachine,
  createStreamEnrichmentMachineImplementations,
} from './stream_enrichment_state_machine';
import type { StreamEnrichmentInput, StreamEnrichmentServiceDependencies } from './types';
import type {
  PreviewDocsFilterOption,
  SimulationActorSnapshot,
  SimulationContext,
} from '../simulation_state_machine';
import type { MappedSchemaField, SchemaField } from '../../../schema_editor/types';
import type { InteractiveModeSnapshot } from '../interactive_mode_machine';
import type { YamlModeSnapshot } from '../yaml_mode_machine';

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
      service, // Expose service for direct access when needed
      resetSteps: (steps: StreamlangDSL['steps']) => {
        service.send({ type: 'step.resetSteps', steps });
      },
      addProcessor: (
        step?: StreamlangProcessorDefinition,
        options?: { parentId: StreamlangStepWithUIAttributes['parentId'] }
      ) => {
        service.send({ type: 'step.addProcessor', step, options });
      },
      duplicateProcessor: (id: string) => {
        service.send({ type: 'step.duplicateProcessor', processorStepId: id });
      },
      addCondition: (
        step?: StreamlangConditionBlock,
        options?: { parentId: StreamlangStepWithUIAttributes['parentId'] }
      ) => {
        service.send({ type: 'step.addCondition', step, options });
      },
      switchToInteractiveMode: () => {
        service.send({ type: 'mode.switchToInteractive' });
      },
      switchToYamlMode: () => {
        service.send({ type: 'mode.switchToYAML' });
      },
      sendYAMLUpdates: (streamlangDSL: StreamlangDSL, yaml: string) => {
        service.send({ type: 'yaml.contentChanged', streamlangDSL, yaml });
      },
      runSimulation: (stepIdBreakpoint?: string) => {
        service.send({ type: 'yaml.runSimulation', stepIdBreakpoint });
      },
      reorderStep: (stepId: string, direction: 'up' | 'down') => {
        service.send({ type: 'step.reorder', stepId, direction });
      },
      reorderStepByDragDrop: (
        sourceStepId: string,
        targetStepId: string,
        operation: 'before' | 'after' | 'inside'
      ) => {
        service.send({ type: 'step.reorderByDragDrop', sourceStepId, targetStepId, operation });
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
      filterSimulationByCondition: (conditionId: string) => {
        service.send({ type: 'simulation.filterByCondition', conditionId });
      },
      clearSimulationConditionFilter: () => {
        service.send({ type: 'simulation.clearConditionFilter' });
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
      selectDataSource: (id: string) => {
        service.send({ type: 'dataSources.select', id });
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
      setPreviewColumnsSorting: (sorting: SimulationContext['previewColumnsSorting']) => {
        service.send({ type: 'previewColumns.setSorting', sorting });
      },
      // Pipeline suggestion actions
      suggestPipeline: (params: { connectorId: string; streamName: string }) => {
        service.send({ type: 'suggestion.generate', connectorId: params.connectorId });
      },
      clearSuggestedSteps: () => {
        service.send({ type: 'suggestion.dismiss' });
      },
      cancelSuggestion: () => {
        service.send({ type: 'suggestion.cancel' });
      },
      acceptSuggestion: () => {
        service.send({ type: 'suggestion.accept' });
      },
    }),
    [service]
  );
};

export const StreamEnrichmentContextProvider = ({
  children,
  definition,
  ...deps
}: React.PropsWithChildren<
  StreamEnrichmentServiceDependencies & { definition: Streams.ingest.all.GetResponse }
>) => {
  // Create a single GrokCollection instance that will be shared across all components
  const grokCollection = useMemo(() => new GrokCollection(), []);

  return (
    <GrokCollectionProvider grokCollection={grokCollection}>
      <StreamEnrichmentContext.Provider
        logic={streamEnrichmentMachine.provide(createStreamEnrichmentMachineImplementations(deps))}
        options={{
          id: 'streamEnrichment',
          inspect: consoleInspector,
          input: {
            definition,
            grokCollection,
          },
        }}
      >
        <ListenForDefinitionChanges definition={definition}>{children}</ListenForDefinitionChanges>
      </StreamEnrichmentContext.Provider>
    </GrokCollectionProvider>
  );
};

const ListenForDefinitionChanges = ({
  children,
  definition,
}: React.PropsWithChildren<Omit<StreamEnrichmentInput, 'grokCollection'>>) => {
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

  return useSelector(simulationRef, selector);
};

export const useInteractiveModeSelector = <T,>(
  selector: (state: InteractiveModeSnapshot) => T
): T => {
  const interactiveModeRef = useStreamEnrichmentSelector(
    (state) => state.context.interactiveModeRef
  );

  if (!interactiveModeRef) {
    throw new Error('useInteractiveModeSelector must be used within interactive mode');
  }

  return useSelector(interactiveModeRef, selector);
};

/**
 * Safe version of useInteractiveModeSelector that returns a fallback value
 * when not in interactive mode instead of throwing.
 */
export const useOptionalInteractiveModeSelector = <T,>(
  selector: (state: InteractiveModeSnapshot) => T,
  fallback: T
): T => {
  const interactiveModeRef = useStreamEnrichmentSelector(
    (state) => state.context.interactiveModeRef
  );

  const selectedValue = useSelector(interactiveModeRef, (state) =>
    state ? selector(state) : fallback
  );

  return interactiveModeRef ? selectedValue : fallback;
};

export const useYamlModeSelector = <T,>(selector: (state: YamlModeSnapshot) => T): T => {
  const yamlModeRef = useStreamEnrichmentSelector((state) => state.context.yamlModeRef);

  if (!yamlModeRef) {
    throw new Error('useYamlModeSelector must be used within YAML mode');
  }

  return useSelector(yamlModeRef, selector);
};
