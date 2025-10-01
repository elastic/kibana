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
import { i18n } from '@kbn/i18n';
import type { StreamQueryKql, Streams, System } from '@kbn/streams-schema';
import { streamQuerySchema } from '@kbn/streams-schema';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/css';
import { v4 } from 'uuid';
import { from, concatMap } from 'rxjs';
import { getStreamTypeFromDefinition } from '../../../util/get_stream_type_from_definition';
import { useKibana } from '../../../hooks/use_kibana';
import { useSignificantEventsApi } from '../../../hooks/use_significant_events_api';
import { FlowSelector } from './flow_selector';
import { GeneratedFlowForm } from './generated_flow_form/generated_flow_form';
import { ManualFlowForm } from './manual_flow_form/manual_flow_form';
import type { Flow, SaveData } from './types';
import { defaultQuery } from './utils/default_query';
import { StreamsAppSearchBar } from '../../streams_app_search_bar';
import { SystemSelector } from '../system_selector';
import { useTimefilter } from '../../../hooks/use_timefilter';
import { useAIFeatures } from './generated_flow_form/use_ai_features';
import { validateQuery } from './common/validate_query';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';

interface Props {
  onClose: () => void;
  definition: Streams.all.Definition;
  onSave: (data: SaveData) => Promise<void>;
  systems: System[];
  query?: StreamQueryKql;
  initialFlow?: Flow;
  initialSelectedSystems?: System[];
}

export function AddSignificantEventFlyout({
  query,
  onClose,
  definition,
  onSave,
  initialFlow = undefined,
  initialSelectedSystems = [],
  systems,
}: Props) {
  const { euiTheme } = useEuiTheme();
  const {
    core: { notifications },
    services: { telemetryClient },
    dependencies: {
      start: { data },
    },
  } = useKibana();
  const {
    timeState: { start, end },
  } = useTimefilter();
  const aiFeatures = useAIFeatures();

  const dataViewsFetch = useStreamsAppFetch(() => {
    return data.dataViews.create({ title: definition.name }).then((value) => {
      return [value];
    });
  }, [data.dataViews, definition.name]);

  const { generate, abort } = useSignificantEventsApi({ name: definition.name, start, end });

  const isEditMode = !!query?.id;
  const [selectedFlow, setSelectedFlow] = useState<Flow | undefined>(
    isEditMode ? 'manual' : initialFlow
  );
  const flowRef = useRef<Flow | undefined>(selectedFlow);
  const [queries, setQueries] = useState<StreamQueryKql[]>([{ ...defaultQuery(), ...query }]);
  const [canSave, setCanSave] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedSystems, setSelectedSystems] = useState<System[]>(initialSelectedSystems);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQueries, setGeneratedQueries] = useState<StreamQueryKql[]>([]);

  const stopGeneration = useCallback(() => {
    setIsGenerating(false);
    abort();
  }, [abort]);

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

  const generateQueries = useCallback(() => {
    const connector = aiFeatures?.genAiConnectors.selectedConnector;
    if (!connector || selectedSystems.length === 0) {
      return;
    }

    const startTime = Date.now();
    setIsGenerating(true);
    setGeneratedQueries([]);

    from(selectedSystems)
      .pipe(
        concatMap((system) =>
          generate(connector, system).pipe(
            concatMap((result) => {
              const validation = validateQuery({
                title: result.query.title,
                kql: { query: result.query.kql },
              });

              if (!validation.kql.isInvalid) {
                setGeneratedQueries((prev) => [
                  ...prev,
                  {
                    id: v4(),
                    kql: { query: result.query.kql },
                    title: result.query.title,
                    system: result.query.system,
                  },
                ]);
              }
              return [];
            })
          )
        )
      )
      .subscribe({
        error: (error) => {
          setIsGenerating(false);
          if (error.name === 'AbortError') {
            return;
          }
          notifications.showErrorDialog({
            title: i18n.translate(
              'xpack.streams.addSignificantEventFlyout.generateErrorToastTitle',
              {
                defaultMessage: `Could not generate significant events queries`,
              }
            ),
            error,
          });
        },
        complete: () => {
          notifications.toasts.addSuccess({
            title: i18n.translate(
              'xpack.streams.addSignificantEventFlyout.generateSuccessToastTitle',
              { defaultMessage: `Generated significant events queries successfully` }
            ),
          });
          telemetryClient.trackSignificantEventsSuggestionsGenerate({
            duration_ms: Date.now() - startTime,
            stream_type: getStreamTypeFromDefinition(definition),
          });
          setIsGenerating(false);
        },
      });
  }, [aiFeatures, definition, generate, notifications, telemetryClient, selectedSystems]);

  useEffect(() => {
    if (initialFlow === 'ai' && initialSelectedSystems.length > 0) {
      generateQueries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiFeatures?.enabled]);

  return (
    <EuiFlyout
      aria-labelledby="addSignificantEventFlyout"
      onClose={() => onClose()}
      size={isEditMode ? 's' : 'l'}
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
                <EuiText>
                  <h4>
                    {i18n.translate(
                      'xpack.streams.streamDetailView.addSignificantEventFlyout.selectOptionLabel',
                      { defaultMessage: 'Select an option' }
                    )}
                  </h4>
                </EuiText>
                <EuiSpacer size="m" />
                <FlowSelector
                  isSubmitting={isSubmitting}
                  selected={selectedFlow}
                  updateSelected={(flow) => {
                    setSelectedFlow(flow);
                    setSelectedSystems([]);
                  }}
                />
                <EuiSpacer size="m" />
                {selectedFlow === 'ai' && (
                  <>
                    <SystemSelector
                      systems={systems}
                      selectedSystems={selectedSystems}
                      onSystemsChange={setSelectedSystems}
                    />
                    <EuiButton
                      iconType="sparkles"
                      fill
                      isLoading={isGenerating}
                      disabled={
                        isSubmitting ||
                        selectedSystems.length === 0 ||
                        !aiFeatures?.genAiConnectors?.selectedConnector
                      }
                      onClick={generateQueries}
                    >
                      {i18n.translate(
                        'xpack.streams.streamDetailView.addSignificantEventFlyout.generateSuggestionsButtonLabel',
                        {
                          defaultMessage: 'Generate suggestions',
                        }
                      )}
                    </EuiButton>
                  </>
                )}
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
                  {selectedFlow === 'manual' && (
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
                        setQuery={(next: StreamQueryKql) => setQueries([next])}
                        query={queries[0]}
                        setCanSave={(next: boolean) => {
                          setCanSave(next);
                        }}
                        definition={definition}
                        dataViews={dataViewsFetch.value ?? []}
                        systems={
                          systems.map((system) => ({
                            name: system.name,
                            filter: system.filter,
                          })) || []
                        }
                      />
                    </>
                  )}

                  {selectedFlow === 'ai' && (
                    <GeneratedFlowForm
                      isGenerating={isGenerating}
                      generatedQueries={generatedQueries}
                      onEditQuery={(editedQuery) => {
                        setGeneratedQueries((prev) =>
                          prev.map((q) => (q.id === editedQuery.id ? editedQuery : q))
                        );
                      }}
                      stopGeneration={stopGeneration}
                      isSubmitting={isSubmitting}
                      definition={definition}
                      setQueries={(next: StreamQueryKql[]) => {
                        setQueries(next);
                      }}
                      setCanSave={(next: boolean) => {
                        setCanSave(next);
                      }}
                      systems={systems}
                      dataViews={dataViewsFetch.value ?? []}
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
                  <EuiButtonEmpty color="primary" onClick={() => onClose()} disabled={isSubmitting}>
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
                            query: queries[0],
                            isUpdating: isEditMode,
                          }).finally(() => setIsSubmitting(false));
                          break;
                        case 'ai':
                          onSave({ type: 'multiple', queries }).finally(() =>
                            setIsSubmitting(false)
                          );
                          break;
                      }
                    }}
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
