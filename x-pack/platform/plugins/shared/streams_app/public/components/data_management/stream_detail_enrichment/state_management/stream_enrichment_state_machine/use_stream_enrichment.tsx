/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { createActorContext, useSelector } from '@xstate5/react';
import { createConsoleInspector } from '@kbn/xstate-utils';
import type { StreamlangDSL, StreamlangWhereBlock } from '@kbn/streamlang/types/streamlang';
import { isActionBlock } from '@kbn/streamlang/types/streamlang';
import type {
  StreamlangProcessorDefinition,
  StreamlangStepWithUIAttributes,
} from '@kbn/streamlang';
import type { DraftGrokExpression } from '@kbn/grok-ui';
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
import { isGrokProcessor } from '../../utils';
import type { StepActorRef } from '../steps_state_machine';
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
        step?: StreamlangWhereBlock,
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
      const snapshot = service.getSnapshot();
      const context = snapshot.context;

      // Only clean up stepRefs if we're in interactive mode
      const isInteractiveMode = snapshot.matches({
        ready: { enrichment: { managingProcessors: 'interactive' } },
      });

      if (isInteractiveMode && context.interactiveModeRef) {
        const modeSnapshot = context.interactiveModeRef.getSnapshot();
        const stepRefs: StepActorRef[] = modeSnapshot.context.stepRefs;

        if (stepRefs) {
          stepRefs.forEach((procRef: StepActorRef) => {
            const procContext = procRef.getSnapshot().context;
            if (isActionBlock(procContext.step) && isGrokProcessor(procContext.step)) {
              const draftGrokExpressions: DraftGrokExpression[] =
                procContext.resources?.grokExpressions ?? [];
              draftGrokExpressions.forEach((expression: DraftGrokExpression) => {
                expression.destroy();
              });
            }
          });
        }
      }
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

export const useYamlModeSelector = <T,>(selector: (state: YamlModeSnapshot) => T): T => {
  const yamlModeRef = useStreamEnrichmentSelector((state) => state.context.yamlModeRef);

  if (!yamlModeRef) {
    throw new Error('useYamlModeSelector must be used within YAML mode');
  }

  return useSelector(yamlModeRef, selector);
};
