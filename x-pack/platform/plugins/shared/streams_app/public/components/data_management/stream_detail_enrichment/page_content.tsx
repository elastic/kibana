/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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
import { useKibana } from '../../../hooks/use_kibana';
import { DraggableProcessorListItem } from './processors_list';
import { SortableList } from './sortable_list';
import { ManagementBottomBar } from '../management_bottom_bar';
import { AddProcessorPanel } from './processors';
import { SimulationPlayground } from './simulation_playground';
import {
  StreamEnrichmentContextProvider,
  useSimulatorSelector,
  useStreamEnrichmentEvents,
  useStreamsEnrichmentSelector,
} from './state_management/stream_enrichment_state_machine';

const MemoSimulationPlayground = React.memo(SimulationPlayground);

interface StreamDetailEnrichmentContentProps {
  definition: IngestStreamGetResponse;
  refreshDefinition: () => void;
}

export function StreamDetailEnrichmentContent(props: StreamDetailEnrichmentContentProps) {
  const { core, dependencies } = useKibana();
  const {
    data,
    streams: { streamsRepositoryClient },
  } = dependencies.start;

  return (
    <StreamEnrichmentContextProvider
      definition={props.definition}
      refreshDefinition={props.refreshDefinition}
      core={core}
      data={data}
      streamsRepositoryClient={streamsRepositoryClient}
    >
      <StreamDetailEnrichmentContentImpl />
    </StreamEnrichmentContextProvider>
  );
}

export function StreamDetailEnrichmentContentImpl() {
  const { appParams, core } = useKibana();

  const { resetChanges, saveChanges } = useStreamEnrichmentEvents();

  const hasChanges = useStreamsEnrichmentSelector((state) => state.can({ type: 'stream.update' }));
  const isSavingChanges = useStreamsEnrichmentSelector((state) =>
    state.matches({ ready: { stream: 'updating' } })
  );

  useUnsavedChangesPrompt({
    hasUnsavedChanges: hasChanges,
    history: appParams.history,
    http: core.http,
    navigateToUrl: core.application.navigateToUrl,
    openConfirm: core.overlays.openConfirm,
  });

  return (
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
                <ProcessorsEditor />
              </EuiResizablePanel>
              <EuiResizableButton indicator="border" accountForScrollbars="both" />
              <EuiResizablePanel
                initialSize={60}
                minSize="300px"
                tabIndex={0}
                paddingSize="s"
                css={verticalFlexCss}
              >
                <MemoSimulationPlayground />
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
  );
}

const ProcessorsEditor = React.memo(() => {
  const { euiTheme } = useEuiTheme();

  const { reorderProcessors } = useStreamEnrichmentEvents();

  const processorsRefs = useStreamsEnrichmentSelector((state) =>
    state.context.processorsRefs.filter((processorRef) =>
      processorRef.getSnapshot().matches('configured')
    )
  );

  const simulationSnapshot = useSimulatorSelector((s) => s);

  const handlerItemDrag: DragDropContextProps['onDragEnd'] = ({ source, destination }) => {
    if (source && destination) {
      const items = euiDragDropReorder(processorsRefs, source.index, destination.index);
      reorderProcessors(items);
    }
  };

  const hasProcessors = !isEmpty(processorsRefs);

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
              defaultMessage: 'Drag and drop existing processors to update their execution order.',
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
            {processorsRefs.map((processorRef, idx) => (
              <DraggableProcessorListItem
                key={processorRef.id}
                idx={idx}
                processorRef={processorRef}
                processorMetrics={
                  simulationSnapshot.context.simulation?.processors_metrics[processorRef.id]
                }
              />
            ))}
          </SortableList>
        )}
        <AddProcessorPanel />
      </EuiPanel>
    </>
  );
});

const verticalFlexCss = css`
  display: flex;
  flex-direction: column;
`;
