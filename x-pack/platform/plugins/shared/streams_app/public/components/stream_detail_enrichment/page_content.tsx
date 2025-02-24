/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  DragDropContextProps,
  EuiPanel,
  EuiResizableContainer,
  EuiSplitPanel,
  EuiText,
  EuiTitle,
  euiDragDropReorder,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IngestStreamGetResponse } from '@kbn/streams-schema';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { css } from '@emotion/react';
import { isEmpty } from 'lodash';
import { useKibana } from '../../hooks/use_kibana';
import { DraggableProcessorListItem } from './processors_list';
import { SortableList } from './sortable_list';
import { ManagementBottomBar } from '../management_bottom_bar';
import { AddProcessorPanel } from './processors';
import { SimulationPlayground } from './simulation_playground';
import {
  UseProcessingSimulatorReturn,
  useProcessingSimulator,
} from './hooks/use_processing_simulator';
import {
  StreamEnrichmentContextProvider,
  StreamEnrichmentEvents,
  useStreamEnrichmentEvents,
  useStreamsEnrichmentSelector,
} from './services/stream_enrichment_service';
import { SimulatorContextProvider } from './simulator_context';
import { StreamEnrichmentContext } from './services/stream_enrichment_service/types';

const MemoSimulationPlayground = React.memo(SimulationPlayground);

interface StreamDetailEnrichmentContentProps {
  definition: IngestStreamGetResponse;
  refreshDefinition: () => void;
}

export function StreamDetailEnrichmentContent(props: StreamDetailEnrichmentContentProps) {
  const { core, dependencies } = useKibana();
  const { streamsRepositoryClient } = dependencies.start.streams;

  return (
    <StreamEnrichmentContextProvider
      definition={props.definition}
      refreshDefinition={props.refreshDefinition}
      core={core}
      streamsRepositoryClient={streamsRepositoryClient}
    >
      <StreamDetailEnrichmentContentImpl />
    </StreamEnrichmentContextProvider>
  );
}

export function StreamDetailEnrichmentContentImpl() {
  const { appParams, core } = useKibana();

  const { reorderProcessors, resetChanges, saveChanges } = useStreamEnrichmentEvents();

  const definition = useStreamsEnrichmentSelector((state) => state.context.definition);
  const processors = useStreamsEnrichmentSelector((state) => state.context.processors);
  const hasChanges = useStreamsEnrichmentSelector((state) => state.can({ type: 'stream.update' }));
  const isSavingChanges = useStreamsEnrichmentSelector((state) => state.matches('updatingStream'));

  const processorList = useMemo(
    () => processors.filter((processor) => processor.getSnapshot().matches('configured')),
    [processors]
  );

  const simulationProcessors = useMemo(
    () => processors.map((p) => p.getSnapshot().context.processor),
    [processors]
  );

  const processingSimulator = useProcessingSimulator({
    definition,
    processors: simulationProcessors,
  });

  const {
    isLoading,
    refreshSamples,
    filteredSamples,
    simulation,
    tableColumns,
    selectedDocsFilter,
    setSelectedDocsFilter,
  } = processingSimulator;

  useUnsavedChangesPrompt({
    hasUnsavedChanges: hasChanges,
    history: appParams.history,
    http: core.http,
    navigateToUrl: core.application.navigateToUrl,
    openConfirm: core.overlays.openConfirm,
  });

  return (
    <SimulatorContextProvider processingSimulator={processingSimulator} definition={definition}>
      <EuiSplitPanel.Outer grow hasBorder hasShadow={false}>
        <EuiSplitPanel.Inner
          paddingSize="none"
          css={css`
            display: flex;
            overflow: hidden auto;
          `}
        >
          <EuiResizableContainer>
            {(EuiResizablePanel, EuiResizableButton) => (
              <>
                <EuiResizablePanel
                  initialSize={40}
                  minSize="480px"
                  tabIndex={0}
                  paddingSize="none"
                  css={verticalFlexCss}
                >
                  <ProcessorsEditor
                    definition={definition}
                    processors={processorList}
                    onReorderProcessor={reorderProcessors}
                    simulation={simulation}
                  />
                </EuiResizablePanel>
                <EuiResizableButton indicator="border" accountForScrollbars="both" />
                <EuiResizablePanel
                  initialSize={60}
                  minSize="300px"
                  tabIndex={0}
                  paddingSize="s"
                  css={verticalFlexCss}
                >
                  <MemoSimulationPlayground
                    definition={definition}
                    columns={tableColumns}
                    simulation={simulation}
                    filteredSamples={filteredSamples}
                    onRefreshSamples={refreshSamples}
                    isLoading={isLoading}
                    selectedDocsFilter={selectedDocsFilter}
                    setSelectedDocsFilter={setSelectedDocsFilter}
                  />
                </EuiResizablePanel>
              </>
            )}
          </EuiResizableContainer>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner grow={false} color="subdued">
          <ManagementBottomBar
            onCancel={resetChanges}
            onConfirm={saveChanges}
            isLoading={isSavingChanges}
            disabled={!hasChanges}
          />
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
    </SimulatorContextProvider>
  );
}

interface ProcessorsEditorProps {
  definition: IngestStreamGetResponse;
  processors: StreamEnrichmentContext['processors'];
  onReorderProcessor: StreamEnrichmentEvents['reorderProcessors'];
  simulation: UseProcessingSimulatorReturn['simulation'];
}

const ProcessorsEditor = React.memo(
  ({ definition, processors, onReorderProcessor, simulation }: ProcessorsEditorProps) => {
    const { euiTheme } = useEuiTheme();

    const handlerItemDrag: DragDropContextProps['onDragEnd'] = ({ source, destination }) => {
      if (source && destination) {
        const items = euiDragDropReorder(processors, source.index, destination.index);
        onReorderProcessor({ processors: items });
      }
    };

    const hasProcessors = !isEmpty(processors);

    return (
      <>
        <EuiPanel
          paddingSize="m"
          hasShadow={false}
          borderRadius="none"
          grow={false}
          css={css`
            z-index: ${euiTheme.levels.maskBelowHeader};
            ${useEuiShadow('xs')};
          `}
        >
          <EuiTitle size="xxs">
            <h2>
              {i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.headingTitle',
                {
                  defaultMessage: 'Processors for field extraction',
                }
              )}
            </h2>
          </EuiTitle>
          <EuiText component="p" size="xs">
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.headingSubtitle',
              {
                defaultMessage:
                  'Drag and drop existing processors to update their execution order.',
              }
            )}
          </EuiText>
        </EuiPanel>
        <EuiPanel
          paddingSize="m"
          hasShadow={false}
          borderRadius="none"
          css={css`
            overflow: auto;
          `}
        >
          {hasProcessors && (
            <SortableList onDragItem={handlerItemDrag}>
              {processors.map((processor, idx) => (
                <DraggableProcessorListItem
                  key={processor.id}
                  idx={idx}
                  definition={definition}
                  processor={processor}
                  processorMetrics={simulation?.processors_metrics[processor.id]}
                />
              ))}
            </SortableList>
          )}
          <AddProcessorPanel
            key={processors.length} // Used to force reset the inner form state once a new processor is added
            definition={definition}
            processorMetrics={simulation?.processors_metrics.draft}
          />
        </EuiPanel>
      </>
    );
  }
);

const verticalFlexCss = css`
  display: flex;
  flex-direction: column;
`;
