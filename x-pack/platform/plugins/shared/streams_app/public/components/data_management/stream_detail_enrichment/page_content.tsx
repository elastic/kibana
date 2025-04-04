/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  DragDropContextProps,
  EuiAccordion,
  EuiCode,
  EuiFlexGroup,
  EuiPanel,
  EuiResizableContainer,
  EuiSplitPanel,
  EuiText,
  EuiTitle,
  euiDragDropReorder,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IngestStreamGetResponse } from '@kbn/streams-schema';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { css } from '@emotion/react';
import { isEmpty } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
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

  const simulation = useSimulatorSelector((snapshot) => snapshot.context.simulation);

  const errors = useMemo(() => {
    if (!simulation) {
      return { ignoredFields: [], mappingFailures: [] };
    }

    const ignoredFieldsSet = new Set<string>();
    const mappingFailuresSet = new Set<string>();

    simulation.documents.forEach((doc) => {
      doc.errors.forEach((error) => {
        if (error.type === 'ignored_fields_failure') {
          error.ignored_fields.forEach((ignored) => {
            ignoredFieldsSet.add(ignored.field);
          });
        }

        if (error.type === 'field_mapping_failure' && mappingFailuresSet.size < 2) {
          mappingFailuresSet.add(error.message);
        }
      });
    });

    return {
      ignoredFields: Array.from(ignoredFieldsSet),
      mappingFailures: Array.from(mappingFailuresSet),
    };
  }, [simulation]);

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
          border-bottom: ${euiTheme.border.thin};
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
                processorMetrics={simulation?.processors_metrics[processorRef.id]}
              />
            ))}
          </SortableList>
        )}
        <AddProcessorPanel />
      </EuiPanel>
      <EuiPanel paddingSize="m" hasShadow={false} grow={false}>
        {!isEmpty(errors.ignoredFields) && (
          <EuiPanel paddingSize="s" hasShadow={false} grow={false} color="danger">
            <EuiAccordion
              id="ignored-fields-failures-accordion"
              initialIsOpen
              buttonContent={
                <strong>
                  {i18n.translate(
                    'xpack.streams.streamDetailView.managementTab.enrichment.ignoredFieldsFailure.title',
                    { defaultMessage: 'Some fields were ignored during the simulation.' }
                  )}
                </strong>
              }
            >
              <EuiText component="p" size="s">
                <p>
                  {i18n.translate(
                    'xpack.streams.streamDetailView.managementTab.enrichment.ignoredFieldsFailure.description',
                    {
                      defaultMessage:
                        'Some fields in these documents were ignored during the ingestion simulation. Review the fields’ mapping limits.',
                    }
                  )}
                </p>
                <p>
                  <FormattedMessage
                    id="xpack.streams.streamDetailView.managementTab.enrichment.ignoredFieldsFailure.fieldsList"
                    defaultMessage="The ignored fields are: {fields}"
                    values={{
                      fields: (
                        <EuiFlexGroup
                          gutterSize="s"
                          css={css`
                            margin-top: ${euiTheme.size.s};
                          `}
                        >
                          {errors.ignoredFields.map((field) => (
                            <EuiCode>{field}</EuiCode>
                          ))}
                        </EuiFlexGroup>
                      ),
                    }}
                  />
                </p>
              </EuiText>
            </EuiAccordion>
          </EuiPanel>
        )}
        {!isEmpty(errors.mappingFailures) && (
          <EuiPanel paddingSize="s" hasShadow={false} grow={false} color="danger">
            <EuiAccordion
              id="mapping-failures-accordion"
              initialIsOpen
              buttonContent={i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.fieldMappingsFailure.title',
                {
                  defaultMessage: 'Field conflicts during simulation',
                }
              )}
            >
              <EuiText size="s">
                <p>
                  <FormattedMessage
                    id="xpack.streams.streamDetailView.managementTab.enrichment.fieldMappingsFailure.fieldsList"
                    defaultMessage="These are some mapping failures that occurred during the simulation:"
                  />
                </p>
                <ul>
                  {errors.mappingFailures.map((failureMessage, id) => (
                    <li key={id}>
                      <EuiText css={clampTwoLines} size="s">
                        {failureMessage}
                      </EuiText>
                    </li>
                  ))}
                </ul>
              </EuiText>
            </EuiAccordion>
          </EuiPanel>
        )}
      </EuiPanel>
    </>
  );
});

const verticalFlexCss = css`
  display: flex;
  flex-direction: column;
`;

const clampTwoLines = css`
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
`;
