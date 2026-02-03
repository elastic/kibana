/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { omit } from 'lodash';
import { i18n } from '@kbn/i18n';
import { type StreamQueryKql, type Streams, type System } from '@kbn/streams-schema';
import { streamQuerySchema } from '@kbn/streams-schema';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/css';
import { v4 } from 'uuid';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { useKibana } from '../../../hooks/use_kibana';
import { useSignificantEventsApi } from '../../../hooks/use_significant_events_api';
import type { AIFeatures } from '../../../hooks/use_ai_features';
import { GeneratedFlowForm } from './generated_flow_form/generated_flow_form';
import { ManualFlowForm } from './manual_flow_form/manual_flow_form';
import type { Flow, SaveData } from './types';
import { defaultQuery } from './utils/default_query';
import { StreamsAppSearchBar } from '../../streams_app_search_bar';
import { validateQuery } from './common/validate_query';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';
import { useTaskPolling } from '../../../hooks/use_task_polling';
import { SignificantEventsGenerationPanel } from '../generation_panel';

interface Props {
  onClose: () => void;
  definition: Streams.all.GetResponse;
  onSave: (data: SaveData) => Promise<void>;
  systems: System[];
  query?: StreamQueryKql;
  initialFlow?: Flow;
  initialSelectedSystems: System[];
  refreshSystems: () => void;
  generateOnMount: boolean;
  aiFeatures: AIFeatures | null;
}

export function AddSignificantEventFlyout({
  generateOnMount,
  query,
  onClose,
  definition,
  onSave,
  initialFlow = undefined,
  initialSelectedSystems,
  systems,
  refreshSystems,
  aiFeatures,
}: Props) {
  const { euiTheme } = useEuiTheme();
  const {
    dependencies: {
      start: { data },
    },
  } = useKibana();

  const dataViewsFetch = useStreamsAppFetch(() => {
    return data.dataViews.create({ title: definition.stream.name }).then((value) => {
      return [value];
    });
  }, [data.dataViews, definition.stream.name]);

  const { cancelGenerationTask, getGenerationTask, scheduleGenerationTask } =
    useSignificantEventsApi({ name: definition.stream.name });

  const isEditMode = !!query?.id;
  const [selectedFlow, setSelectedFlow] = useState<Flow | undefined>(
    isEditMode ? 'manual' : initialFlow
  );
  const flowRef = useRef<Flow | undefined>(selectedFlow);
  const [queries, setQueries] = useState<StreamQueryKql[]>([{ ...defaultQuery(), ...query }]);
  const [canSave, setCanSave] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedSystems, setSelectedSystems] = useState<System[]>(initialSelectedSystems);

  const [generatedQueries, setGeneratedQueries] = useState<StreamQueryKql[]>([]);
  const [{ loading: isGettingTask, value: task }, getTask] = useAsyncFn(getGenerationTask);
  const [{ loading: isSchedulingGenerationTask }, doScheduleGenerationTask] =
    useAsyncFn(scheduleGenerationTask);

  useEffect(() => {
    getTask();
  }, [getTask]);

  useTaskPolling(task, getGenerationTask, getTask);

  const isBeingCanceled = task?.status === 'being_canceled';
  const isGenerating =
    task?.status === 'in_progress' ||
    isBeingCanceled ||
    isGettingTask ||
    isSchedulingGenerationTask;

  const prevTaskStatusRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const prevStatus = prevTaskStatusRef.current;
    prevTaskStatusRef.current = task?.status;

    // Process completed when:
    // - First time getting the task (prevStatus is undefined)
    // - Transitioning from in_progress to completed
    const isFirstLoad = prevStatus === undefined;
    const isTransitionFromInProgress = prevStatus === 'in_progress';
    if (
      task?.status === 'completed' &&
      (isFirstLoad || isTransitionFromInProgress) &&
      !isGenerating
    ) {
      setGeneratedQueries(
        task.queries
          .filter((nextQuery) => {
            const validation = validateQuery({
              title: nextQuery.title,
              kql: { query: nextQuery.kql },
            });
            return validation.kql.isInvalid === false;
          })
          .map((nextQuery) => ({
            id: v4(),
            kql: { query: nextQuery.kql },
            title: nextQuery.title,
            feature: nextQuery.feature,
            severity_score: nextQuery.severity_score,
            evidence: nextQuery.evidence,
          }))
      );
    }
  }, [isGenerating, task]);

  const stopGeneration = useCallback(() => {
    if (task?.status === 'in_progress') {
      cancelGenerationTask().then(() => {
        getTask();
      });
    }
  }, [cancelGenerationTask, getTask, task?.status]);

  const parsedQueries = useMemo(() => {
    return streamQuerySchema.array().safeParse(queries);
  }, [queries]);

  useEffect(() => {
    if (flowRef.current !== selectedFlow) {
      flowRef.current = selectedFlow;
      setIsSubmitting(false);
      setCanSave(false);
      setQueries([defaultQuery()]);
    }
  }, [selectedFlow]);

  const generateQueries = useCallback(
    (systemsOverride?: System[]) => {
      const connectorId = aiFeatures?.genAiConnectors.selectedConnector;
      if (!connectorId) {
        return;
      }

      setSelectedFlow('ai');
      setGeneratedQueries([]);

      const effectiveSystems = systemsOverride ?? selectedSystems;

      (async () => {
        await doScheduleGenerationTask(connectorId, effectiveSystems);
        getTask();
      })();
    },
    [
      aiFeatures?.genAiConnectors.selectedConnector,
      selectedSystems,
      doScheduleGenerationTask,
      getTask,
    ]
  );

  useEffect(() => {
    if (initialFlow === 'ai' && generateOnMount) {
      generateQueries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiFeatures?.enabled]);

  return (
    <EuiFlyout
      aria-labelledby="addSignificantEventFlyout"
      onClose={() => onClose()}
      size={isEditMode ? 'm' : 'l'}
      type={isEditMode ? 'push' : 'overlay'}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>
            {isEditMode
              ? i18n.translate(
                  'xpack.streams.streamDetailView.addSignificantEventFlyout.editTitle',
                  { defaultMessage: 'Edit significant events' }
                )
              : i18n.translate(
                  'xpack.streams.streamDetailView.addSignificantEventFlyout.createTitle',
                  { defaultMessage: 'Add significant events' }
                )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody
        className={css`
          & .euiFlyoutBody__overflow {
            mask-image: none;
          }
          & .euiFlyoutBody__overflowContent {
            height: 100%;
            padding: 0;
          }
        `}
      >
        <EuiFlexGroup gutterSize="none" css={{ height: '100%' }}>
          {!isEditMode && (
            <EuiFlexItem
              grow={1}
              className={css`
                border-right: 1px solid ${euiTheme.colors.borderBaseSubdued};
                height: 100%;
              `}
            >
              <EuiPanel hasShadow={false} paddingSize="l">
                <SignificantEventsGenerationPanel
                  onManualEntryClick={() => setSelectedFlow('manual')}
                  systems={systems}
                  selectedSystems={selectedSystems}
                  onSystemsChange={setSelectedSystems}
                  onGenerateSuggestionsClick={generateQueries}
                  definition={definition.stream}
                  refreshSystems={refreshSystems}
                  isGeneratingQueries={isGenerating}
                  isSavingManualEntry={isSubmitting}
                  selectedFlow={selectedFlow}
                  aiFeatures={aiFeatures}
                />
              </EuiPanel>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={3}>
            <EuiFlexGroup
              direction="column"
              gutterSize="none"
              justifyContent="spaceBetween"
              css={{ height: '100%' }}
            >
              <EuiFlexItem grow={1} css={{ overflow: 'scroll' }}>
                <EuiPanel hasShadow={false} paddingSize="l">
                  {flowRef.current === 'manual' && (
                    <>
                      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                        <EuiFlexItem grow={false}>
                          <EuiText>
                            <h4>
                              {i18n.translate(
                                'xpack.streams.streamDetailView.addSignificantEventFlyout.previewSignificantEventsLabel',
                                { defaultMessage: 'Preview significant events' }
                              )}
                            </h4>
                          </EuiText>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <StreamsAppSearchBar showDatePicker />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                      <EuiSpacer size="m" />
                      <ManualFlowForm
                        isSubmitting={isSubmitting}
                        isEditMode={isEditMode}
                        setQuery={(next: StreamQueryKql) => setQueries([next])}
                        query={queries[0]}
                        setCanSave={(next: boolean) => {
                          setCanSave(next);
                        }}
                        definition={definition.stream}
                        dataViews={dataViewsFetch.value ?? []}
                        systems={systems}
                      />
                    </>
                  )}

                  {flowRef.current === 'ai' && (
                    <GeneratedFlowForm
                      isBeingCanceled={isBeingCanceled}
                      isSubmitting={isSubmitting}
                      isGenerating={isGenerating}
                      generatedQueries={generatedQueries}
                      onEditQuery={(editedQuery) => {
                        setGeneratedQueries((prev) =>
                          prev.map((q) => (q.id === editedQuery.id ? editedQuery : q))
                        );
                      }}
                      stopGeneration={stopGeneration}
                      definition={definition.stream}
                      setQueries={(next: StreamQueryKql[]) => {
                        setQueries(next);
                      }}
                      setCanSave={(next: boolean) => {
                        setCanSave(next);
                      }}
                      systems={systems}
                      dataViews={dataViewsFetch.value ?? []}
                      taskStatus={task?.status}
                      taskError={task?.status === 'failed' ? task.error : undefined}
                    />
                  )}
                </EuiPanel>
              </EuiFlexItem>

              <EuiFlexItem
                grow={false}
                css={{
                  backgroundColor: euiTheme.colors.backgroundBaseSubdued,
                  padding: euiTheme.size.l,
                }}
              >
                <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween" alignItems="center">
                  <EuiButtonEmpty
                    color="primary"
                    onClick={() => onClose()}
                    disabled={isSubmitting}
                    data-test-subj={
                      selectedFlow === 'manual'
                        ? 'significant_events_manual_entry_cancel_button'
                        : 'significant_events_ai_generate_cancel_button'
                    }
                  >
                    {i18n.translate(
                      'xpack.streams.streamDetailView.addSignificantEventFlyout.cancelButtonLabel',
                      { defaultMessage: 'Cancel' }
                    )}
                  </EuiButtonEmpty>
                  <EuiButton
                    color="primary"
                    fill
                    disabled={!parsedQueries.success || !canSave || isGenerating}
                    isLoading={isSubmitting}
                    onClick={() => {
                      setIsSubmitting(true);

                      switch (selectedFlow) {
                        case 'manual':
                          onSave({
                            type: 'single',
                            query: {
                              ...queries[0],
                              feature: queries[0].feature
                                ? omit(queries[0].feature, 'description')
                                : undefined,
                            },
                            isUpdating: isEditMode,
                          }).finally(() => setIsSubmitting(false));
                          break;
                        case 'ai':
                          onSave({
                            type: 'multiple',
                            queries: queries.map((nextQuery) => ({
                              ...nextQuery,
                              feature: nextQuery.feature
                                ? omit(nextQuery.feature, 'description')
                                : undefined,
                            })),
                          }).finally(() => setIsSubmitting(false));
                          break;
                      }
                    }}
                    data-test-subj={
                      isEditMode
                        ? 'significant_events_edit_save_button'
                        : selectedFlow === 'manual'
                        ? 'significant_events_manual_entry_save_button'
                        : 'significant_events_ai_generate_save_button'
                    }
                  >
                    {selectedFlow === 'manual'
                      ? isEditMode
                        ? i18n.translate(
                            'xpack.streams.streamDetailView.addSignificantEventFlyout.updateButtonLabel',
                            { defaultMessage: 'Update event' }
                          )
                        : i18n.translate(
                            'xpack.streams.streamDetailView.addSignificantEventFlyout.addButtonLabel',
                            { defaultMessage: 'Add event' }
                          )
                      : i18n.translate(
                          'xpack.streams.streamDetailView.addSignificantEventFlyout.addSelectedButtonLabel',
                          { defaultMessage: 'Add selected' }
                        )}
                  </EuiButton>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
