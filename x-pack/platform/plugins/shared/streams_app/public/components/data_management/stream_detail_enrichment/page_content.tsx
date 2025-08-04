/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dump, load } from 'js-yaml';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { z } from '@kbn/zod';
import {
  DragDropContextProps,
  EuiAccordion,
  EuiButton,
  EuiCode,
  EuiDroppable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPanel,
  EuiResizableContainer,
  EuiSplitPanel,
  EuiSwitch,
  EuiText,
  EuiTimeline,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Streams, processorDefinitionSchema } from '@kbn/streams-schema';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { css } from '@emotion/react';
import { css as cssCss } from '@emotion/css';
import { isEmpty } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { CodeEditor, monaco } from '@kbn/code-editor';
import Zod from '@kbn/zod';
import { useKbnUrlStateStorageFromRouterContext } from '../../../util/kbn_url_state_context';
import { useKibana } from '../../../hooks/use_kibana';
import { DraggableProcessorListItem } from './processors_list';
import { SortableList } from './sortable_list';
import { ManagementBottomBar } from '../management_bottom_bar';
import { SimulationPlayground } from './simulation_playground';
import {
  StreamEnrichmentContextProvider,
  useSimulatorSelector,
  useStreamEnrichmentEvents,
  useStreamEnrichmentSelector,
} from './state_management/stream_enrichment_state_machine';
import { NoProcessorsEmptyPrompt } from './empty_prompts';
import { processorsWithUIAttributesToApiDefinition } from './utils';
import { getTabContentAvailableHeight } from './get_height';
import { ProcessorStatusIndicator } from './processor_status_indicator';

const MemoSimulationPlayground = React.memo(SimulationPlayground);

interface StreamDetailEnrichmentContentProps {
  definition: Streams.ingest.all.GetResponse;
  refreshDefinition: () => void;
}

export function StreamDetailEnrichmentContent(props: StreamDetailEnrichmentContentProps) {
  const { core, dependencies } = useKibana();
  const {
    data,
    streams: { streamsRepositoryClient },
  } = dependencies.start;

  const urlStateStorageContainer = useKbnUrlStateStorageFromRouterContext();

  return (
    <StreamEnrichmentContextProvider
      definition={props.definition}
      refreshDefinition={props.refreshDefinition}
      core={core}
      data={data}
      streamsRepositoryClient={streamsRepositoryClient}
      urlStateStorageContainer={urlStateStorageContainer}
    >
      <StreamDetailEnrichmentContentImpl />
    </StreamEnrichmentContextProvider>
  );
}

export function StreamDetailEnrichmentContentImpl() {
  const { appParams, core } = useKibana();

  const { resetChanges, saveChanges } = useStreamEnrichmentEvents();

  const isReady = useStreamEnrichmentSelector((state) => state.matches('ready'));
  const hasChanges = useStreamEnrichmentSelector((state) => state.can({ type: 'stream.update' }));
  const canManage = useStreamEnrichmentSelector(
    (state) => state.context.definition.privileges.manage
  );
  const isSavingChanges = useStreamEnrichmentSelector((state) =>
    state.matches({ ready: { stream: 'updating' } })
  );

  useUnsavedChangesPrompt({
    hasUnsavedChanges: hasChanges,
    history: appParams.history,
    http: core.http,
    navigateToUrl: core.application.navigateToUrl,
    openConfirm: core.overlays.openConfirm,
    shouldPromptOnReplace: false,
  });

  if (!isReady) {
    return null;
  }

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
          insufficientPrivileges={!canManage}
        />
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
}

const ProcessorsEditor = React.memo(() => {
  const { euiTheme } = useEuiTheme();

  const { addProcessor, reorderProcessors } = useStreamEnrichmentEvents();

  const canAddProcessor = useStreamEnrichmentSelector((state) =>
    state.can({ type: 'processors.add' })
  );
  const canReorderProcessors = useStreamEnrichmentSelector((state) =>
    state.can({ type: 'processors.reorder', from: Number(), to: Number() })
  );

  const processorsRefs = useStreamEnrichmentSelector((state) => state.context.processorsRefs);

  const simulation = useSimulatorSelector((snapshot) => snapshot.context.simulation);

  const [yamlMode, setYamlMode] = useState(false);

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
      reorderProcessors(
        source.index,
        destination.index,
        source.droppableId,
        destination.droppableId
      );
    }
  };
  const hasProcessors = !isEmpty(processorsRefs);

  return (
    <>
      <EuiPanel paddingSize="m" hasShadow={false} borderRadius="none" grow={false}>
        <EuiFlexGroup alignItems="center" wrap>
          <EuiFlexItem>
            <EuiTitle size="xxs">
              <h2>
                {i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.headingTitle',
                  {
                    defaultMessage: 'Add and configure processors',
                  }
                )}
              </h2>
            </EuiTitle>
            <EuiFlexGroup alignItems="center" gutterSize="xs">
              <EuiText component="p" size="xs">
                {i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.headingSubtitle',
                  {
                    defaultMessage: 'Reorder processors to change their execution order',
                  }
                )}
              </EuiText>
              <EuiIconTip
                size="m"
                content={i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.headingSubtitleTooltip',
                  {
                    defaultMessage:
                      'The simulation runs only on new processors. If none are being edited, it includes all new ones. If a processor is under edit, it runs only up to that point, any new processors after it are excluded. If there’s a mix of persisted and new processors, the simulation is skipped entirely.',
                  }
                )}
                position="right"
              />
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiButton
            size="s"
            iconType="plus"
            onClick={() => addProcessor()}
            disabled={!canAddProcessor}
          >
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.addProcessorButton',
              { defaultMessage: 'Add processor' }
            )}
          </EuiButton>
        </EuiFlexGroup>
      </EuiPanel>
      <EuiSwitch
        label={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.yamlModeSwitchLabel',
          { defaultMessage: 'YAML mode' }
        )}
        checked={yamlMode}
        onChange={(e) => setYamlMode(e.target.checked)}
        data-test-subj="yamlModeSwitch"
      />
      {yamlMode ? (
        <YamlProcessingEditor />
      ) : hasProcessors ? (
        <EuiPanel
          hasShadow={false}
          borderRadius="none"
          css={css`
            overflow: auto;
            padding: ${euiTheme.size.m};
          `}
        >
          <SortableList onDragItem={handlerItemDrag}>
            <EuiTimeline aria-label="Processors list" gutterSize="m">
              {processorsRefs
                .filter(
                  (processorRef) => !processorRef.getSnapshot().context.processor.whereParentId
                )
                .map((processorRef, idx) => (
                  <DraggableProcessorListItem
                    isDragDisabled={!canReorderProcessors}
                    key={processorRef.id}
                    subId={'main-list'}
                    idx={idx}
                    processorRef={processorRef}
                    processorMetrics={simulation?.processors_metrics[processorRef.id]}
                  />
                ))}
              <EuiDroppable
                droppableId={'main-list-merge'}
                css={css`
                  width: 100%;
                  min-height: 100px;
                `}
              >
                <span />
              </EuiDroppable>
            </EuiTimeline>
          </SortableList>
        </EuiPanel>
      ) : (
        <NoProcessorsEmptyPrompt />
      )}
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

function YamlProcessingEditor() {
  const processorsRefs = useStreamEnrichmentSelector((state) => state.context.processorsRefs);
  const simulation = useSimulatorSelector((snapshot) => snapshot.context.simulation);
  const [initialProcessors] = useState(() =>
    processorsRefs.map((processorRef) => processorRef.getSnapshot().context.processor)
  );
  const [yamlContent, setYamlContent] = useState(() => {
    const apiDefinition = processorsWithUIAttributesToApiDefinition(initialProcessors);
    return dump(apiDefinition);
  });
  const simState = useSimulatorSelector((s) => s);
  const streamState = useStreamEnrichmentSelector((s) => s);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>();
  // Compute markers for top-level processors
  const markers = useMemo(() => {
    const topLevelRefs = processorsRefs.filter(
      (processorRef) => !processorRef.getSnapshot().context.processor.whereParentId
    );
    const apiDefinition = processorsWithUIAttributesToApiDefinition(
      processorsRefs.map((processorRef) => processorRef.getSnapshot().context.processor)
    );
    let currentLine = 0;
    return topLevelRefs.map((ref, idx) => {
      const dumped = dump([apiDefinition[idx]]);
      const lineCount = dumped.split('\n').length - 1;
      const marker = { processorRef: ref, line: currentLine };
      currentLine += lineCount;
      return marker;
    });
  }, [processorsRefs, simulation?.documents]);
  const [editorHeight, setEditorHeight] = useState<number>(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { updateAllProcessors } = useStreamEnrichmentEvents();
  useEffect(() => {
    if (!wrapperRef.current) return;
    const height = getTabContentAvailableHeight(wrapperRef.current, 0);
    setEditorHeight(height);
  }, []);

  // Helper to get status for a processorRef (logic copied from ProcessorStatusIndicator)
  function getProcessorStatus(processorRef: any) {
    const snapshot = processorRef.getSnapshot();
    const isNew = snapshot.context.isNew;

    // Get simulation and stream state

    const processorsInSim = simState.context.processors;
    const isParticipatingInSimulation = processorsInSim.find((p) => p.id === processorRef.id);
    const isSimulationRunning = simState.matches('runningSimulation');
    const isPending = simulation && !simulation.processors_metrics[processorRef.id];
    const isFailing = Boolean(
      simulation?.processors_metrics[processorRef.id]?.errors.some(
        (e: any) => e.type === 'generic_simulation_failure'
      )
    );
    const isAnyProcessorBeforePersisted = (() => {
      return processorsRefs
        .map((ref) => ref.getSnapshot())
        .some((s, id, processorSnapshots) => {
          // Skip if this processor is already persisted
          if (!s.context.isNew) return false;

          // Check if there are persisted processors after this position
          const hasPersistedAfter = processorSnapshots
            .slice(id + 1)
            .some(({ context }) => !context.isNew);

          return hasPersistedAfter;
        });
    })();

    if (isAnyProcessorBeforePersisted) {
      return {
        icon: '⛔',
        color: '#ccc',
        tooltip:
          'Simulation is disabled when new processors are placed between previously made processors. To enable simulation, move all new processors to the end.',
      };
    } else if (!isParticipatingInSimulation) {
      return {
        icon: '⏭️',
        color: '#ccc',
        tooltip: isNew
          ? 'Processor skipped because it follows a processor being edited.'
          : 'Processor skipped because it was created in a previous simulation session.',
      };
    } else {
      if (isSimulationRunning) {
        return {
          icon: '⏳',
          color: '#0077cc',
          tooltip: 'Simulating processor',
        };
      } else if (!simulation || isPending) {
        return {
          icon: '🕒',
          color: '#ccc',
          tooltip: 'Pending to run for simulation.',
        };
      } else if (isFailing) {
        return {
          icon: '❌',
          color: '#d36086',
          tooltip: 'Processor configuration failed simulation.',
        };
      } else {
        return {
          icon: '✅',
          color: '#17c964',
          tooltip: 'Processor configuration simulated successfully.',
        };
      }
    }
  }

  // Render status indicators for each marker as Monaco glyphs
  const renderLineMarkers = (editor: monaco.editor.IStandaloneCodeEditor | undefined) => {
    if (!editor || !markers.length) return;
    // Remove old decorations
    if ((editor as any).__statusDecorations) {
      editor.deltaDecorations((editor as any).__statusDecorations, []);
    }
    // Add new decorations
    const decorations = markers.map(({ processorRef, line }, idx) => {
      const status = getProcessorStatus(processorRef);
      return {
        range: new monaco.Range(line + 1, 1, line + 1, 1),
        options: {
          isWholeLine: false,
          glyphMarginClassName: cssCss`
            background: none !important;
            color: ${status.color};
            font-size: 18px;
            line-height: 1;
            text-align: center;
            ::before {
            content: '${status.icon}';
            display: block;
        }
          `,
          glyphMarginHoverMessage: { value: status.tooltip },
        },
      };
    });
    (editor as any).__statusDecorations = editor.deltaDecorations([], decorations);
  };

  useEffect(() => {
    if (editorRef.current) {
      renderLineMarkers(editorRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, editorRef.current]);

  return (
    <EuiPanel paddingSize="m" hasShadow={false} grow={false}>
      <EuiButton
        onClick={() => {
          const parsedYaml = load(yamlContent);

          try {
            const output = z.array(processorDefinitionSchema).parse(parsedYaml);

            updateAllProcessors(output);
          } catch (error) {
            alert('Invalid YAML content: ' + error.message);
          }
          // Figure out how we map the YAML content back to processorsRefs.
          // Then apply by sending processor change, processor create and processor delete events.
        }}
      >
        Apply
      </EuiButton>
      <div
        ref={wrapperRef}
        className={cssCss`
          width: 100%;
          height: ${editorHeight}px;
          // https://github.com/microsoft/monaco-editor/issues/3873
          .codicon-light-bulb {
            display: none !important;
          }
        `}
      >
        <CodeEditor
          languageId="yaml"
          value={yamlContent}
          editorDidMount={(editor) => {
            editorRef.current = editor;
            renderLineMarkers(editor);
          }}
          onChange={(e) => setYamlContent(e)}
          aria-label={i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.yamlEditorAriaLabel',
            { defaultMessage: 'YAML editor' }
          )}
          fullWidth
          height={`${editorHeight}px`}
          options={{
            glyphMargin: true,
          }}
        />
      </div>
    </EuiPanel>
  );
}
