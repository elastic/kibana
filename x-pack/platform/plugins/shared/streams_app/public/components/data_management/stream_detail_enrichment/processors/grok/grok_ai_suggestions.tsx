/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiCodeBlock,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPopover,
  EuiText,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useWatch, useFormContext } from 'react-hook-form';
import { FlattenRecord } from '@kbn/streams-schema';
import type { FindActionResult } from '@kbn/actions-plugin/server';
import { UseGenAIConnectorsResult } from '@kbn/observability-ai-assistant-plugin/public/hooks/use_genai_connectors';
import { useAbortController, useBoolean } from '@kbn/react-hooks';
import useObservable from 'react-use/lib/useObservable';
import { APIReturnType } from '@kbn/streams-plugin/public/api';
import { isEmpty } from 'lodash';
import { css } from '@emotion/css';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useStreamDetail } from '../../../../../hooks/use_stream_detail';
import { useKibana } from '../../../../../hooks/use_kibana';
import { GrokFormState, ProcessorFormState } from '../../types';
import { useSimulatorSelector } from '../../state_management/stream_enrichment_state_machine';
import { selectPreviewDocuments } from '../../state_management/simulation_state_machine/selectors';

const INTERNAL_INFERENCE_CONNECTORS = ['Elastic-Managed-LLM'];

const RefreshButton = ({
  generatePatterns,
  connectors,
  selectConnector,
  currentConnector,
  isLoading,
  hasValidField,
}: {
  generatePatterns: () => void;
  selectConnector?: UseGenAIConnectorsResult['selectConnector'];
  connectors?: FindActionResult[];
  currentConnector?: string;
  isLoading: boolean;
  hasValidField: boolean;
}) => {
  const [isPopoverOpen, { off: closePopover, toggle: togglePopover }] = useBoolean(false);
  const splitButtonPopoverId = useGeneratedHtmlId({
    prefix: 'splitButtonPopover',
  });

  return (
    <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={
            !hasValidField &&
            i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.refreshSuggestionsTooltip',
              {
                defaultMessage:
                  'Make sure the configured field is valid and has samples in existing documents',
              }
            )
          }
        >
          <EuiButton
            size="s"
            iconType="sparkles"
            data-test-subj="streamsAppGrokAiSuggestionsRefreshSuggestionsButton"
            onClick={generatePatterns}
            isLoading={isLoading}
            disabled={currentConnector === undefined || !hasValidField}
          >
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.refreshSuggestions',
              {
                defaultMessage: 'Generate patterns',
              }
            )}
          </EuiButton>
        </EuiToolTip>
      </EuiFlexItem>
      {connectors && connectors.length > 1 && (
        <EuiFlexItem grow={false}>
          <EuiPopover
            id={splitButtonPopoverId}
            isOpen={isPopoverOpen}
            button={
              <EuiButtonIcon
                data-test-subj="streamsAppGrokAiPickConnectorButton"
                onClick={togglePopover}
                display="base"
                size="s"
                iconType="boxesVertical"
                aria-label={i18n.translate('xpack.streams.refreshButton.euiButtonIcon.moreLabel', {
                  defaultMessage: 'More',
                })}
              />
            }
          >
            <EuiContextMenuPanel
              size="s"
              items={connectors.map((connector) => (
                <EuiContextMenuItem
                  key={connector.id}
                  icon={connector.id === currentConnector ? 'check' : 'empty'}
                  onClick={() => {
                    selectConnector?.(connector.id);
                    closePopover();
                  }}
                >
                  {connector.name}
                </EuiContextMenuItem>
              ))}
            />
          </EuiPopover>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

function useAIFeatures() {
  const { dependencies, core } = useKibana();
  const { observabilityAIAssistant, licensing } = dependencies.start;

  const aiAssistantEnabled = observabilityAIAssistant.service.isEnabled();

  const genAiConnectors = observabilityAIAssistant.useGenAIConnectors();

  const aiEnabled =
    aiAssistantEnabled && genAiConnectors.connectors && !isEmpty(genAiConnectors.connectors);

  const currentLicense = useObservable(licensing.license$);

  const couldBeEnabled =
    currentLicense?.hasAtLeast('enterprise') && core.application.capabilities.actions?.save;

  return {
    enabled: aiEnabled,
    couldBeEnabled,
    genAiConnectors,
  };
}

export type SuggestionsResponse =
  APIReturnType<'POST /internal/streams/{name}/processing/_suggestions'>;

function InnerGrokAiSuggestions({
  previewDocuments,
  genAiConnectors,
}: {
  previewDocuments: FlattenRecord[];
  genAiConnectors: UseGenAIConnectorsResult;
}) {
  const {
    dependencies,
    services: { telemetryClient },
  } = useKibana();
  const {
    streams: { streamsRepositoryClient },
  } = dependencies.start;

  const { definition } = useStreamDetail();
  const fieldValue = useWatch<ProcessorFormState, 'field'>({ name: 'field' });
  const form = useFormContext<GrokFormState>();

  const currentConnector = genAiConnectors?.selectedConnector;

  const [isLoadingSuggestions, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<Error | undefined>();
  const [suggestions, setSuggestions] = useState<SuggestionsResponse | undefined>();
  const [blocklist, setBlocklist] = useState<Set<string>>(new Set());

  const abortController = useAbortController();

  const refreshSuggestions = useCallback(() => {
    if (!currentConnector) {
      setSuggestions({ patterns: [], simulations: [] });
      return;
    }
    setSuggestionsLoading(true);
    setSuggestionsError(undefined);
    setSuggestions(undefined);
    const finishTrackingAndReport = telemetryClient.startTrackingAIGrokSuggestionLatency({
      name: definition.stream.name,
      field: fieldValue,
      connector_id: currentConnector,
    });
    streamsRepositoryClient
      .fetch('POST /internal/streams/{name}/processing/_suggestions', {
        signal: abortController.signal,
        params: {
          path: { name: definition.stream.name },
          body: {
            field: fieldValue,
            connectorId: currentConnector,
            samples: previewDocuments,
          },
        },
      })
      .then((response) => {
        finishTrackingAndReport(
          response.patterns.length || 0,
          response.simulations.map((simulation) => simulation.documents_metrics.parsed_rate)
        );
        setSuggestions(response);
        setSuggestionsLoading(false);
      })
      .catch((error) => {
        setSuggestionsError(error);
        setSuggestionsLoading(false);
      });
  }, [
    abortController.signal,
    currentConnector,
    definition.stream.name,
    fieldValue,
    previewDocuments,
    streamsRepositoryClient,
    telemetryClient,
  ]);

  let content: React.ReactNode = null;

  if (suggestionsError) {
    content = <EuiCallOut color="danger">{suggestionsError.message}</EuiCallOut>;
  }

  const { field: currentFieldName, patterns: currentPatterns } = form.getValues();

  const hasValidField = useMemo(() => {
    return Boolean(
      currentFieldName &&
        previewDocuments.some(
          (sample) => sample[currentFieldName] && typeof sample[currentFieldName] === 'string'
        )
    );
  }, [previewDocuments, currentFieldName]);

  const filteredSuggestions = suggestions?.patterns
    .map((pattern, i) => ({
      pattern,
      success_rate: suggestions.simulations[i].documents_metrics.parsed_rate,
      detected_fields_count: suggestions.simulations[i].detected_fields.length,
    }))
    .filter(
      (suggestion) =>
        !blocklist.has(suggestion.pattern) &&
        !currentPatterns.some(({ value }) => value === suggestion.pattern)
    );

  if (suggestions && !suggestions.patterns.length) {
    content = (
      <>
        <EuiCallOut color="primary">
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.noSuggestions',
            { defaultMessage: 'No suggested patterns found' }
          )}{' '}
        </EuiCallOut>
      </>
    );
  } else if (filteredSuggestions && !filteredSuggestions.length) {
    // if all suggestions are in the blocklist or already in the patterns, just show the generation button, but no message
    content = null;
  }

  const isManagedAIConnector = INTERNAL_INFERENCE_CONNECTORS.includes(currentConnector || '');
  const [isManagedAiConnectorCalloutDismissed, setManagedAiConnectorCalloutDismissed] =
    useLocalStorage('streams:managedAiConnectorCalloutDismissed', false);

  const onDismissManagedAiConnectorCallout = useCallback(() => {
    setManagedAiConnectorCalloutDismissed(true);
  }, [setManagedAiConnectorCalloutDismissed]);

  if (filteredSuggestions && filteredSuggestions.length) {
    content = (
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiText size="xs">
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.suggestions',
            {
              defaultMessage: 'Generated patterns',
            }
          )}
        </EuiText>
        {filteredSuggestions.map((suggestion) => {
          return (
            <EuiFlexGroup responsive={false} wrap={false} key={suggestion.pattern}>
              <EuiFlexItem grow basis="0">
                <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
                  <EuiCodeBlock paddingSize="s">{suggestion.pattern}</EuiCodeBlock>
                  <EuiBadge color="hollow">
                    {i18n.translate(
                      'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.matchRate',
                      {
                        defaultMessage: 'Match rate: {matchRate}%',
                        values: {
                          matchRate: (suggestion.success_rate * 100).toFixed(2),
                        },
                      }
                    )}
                  </EuiBadge>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
                  <EuiButtonIcon
                    onClick={() => {
                      const currentState = form.getValues();
                      const hasNoPatterns =
                        !currentState.patterns || !currentState.patterns.some(({ value }) => value);
                      form.clearErrors('patterns');
                      if (hasNoPatterns) {
                        form.setValue('patterns', [{ value: suggestion.pattern }]);
                      } else {
                        form.setValue('patterns', [
                          ...currentState.patterns,
                          { value: suggestion.pattern },
                        ]);
                      }
                      telemetryClient.trackAIGrokSuggestionAccepted({
                        name: definition.stream.name,
                        field: fieldValue,
                        connector_id: currentConnector || 'n/a',
                        match_rate: suggestion.success_rate,
                        detected_fields: suggestion.detected_fields_count,
                      });
                    }}
                    data-test-subj="streamsAppGrokAiSuggestionsButton"
                    iconType="plusInCircle"
                    aria-label={i18n.translate(
                      'xpack.streams.grokAiSuggestions.euiButtonIcon.addPatternLabel',
                      { defaultMessage: 'Add pattern' }
                    )}
                  />
                  <EuiButtonIcon
                    onClick={() => {
                      setBlocklist(new Set([...blocklist, suggestion.pattern]));
                    }}
                    data-test-subj="hideSuggestionButton"
                    iconType="cross"
                    aria-label={i18n.translate(
                      'xpack.streams.grokAiSuggestions.euiButtonIcon.hidePatternSuggestionLabel',
                      { defaultMessage: 'Hide pattern suggestion' }
                    )}
                  />
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        })}
      </EuiFlexGroup>
    );
  }
  return (
    <>
      {content != null && (
        <EuiFlexGroup
          direction="column"
          gutterSize="m"
          // make sure the content is always filling the full width so the
          // refresh button is rendered below in all cases
          className={css`
            width: 100%;
          `}
        >
          {content}
        </EuiFlexGroup>
      )}
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="row" gutterSize="m" justifyContent="flexStart" alignItems="center">
          <RefreshButton
            isLoading={isLoadingSuggestions}
            generatePatterns={refreshSuggestions}
            connectors={genAiConnectors?.connectors}
            selectConnector={genAiConnectors?.selectConnector}
            currentConnector={currentConnector}
            hasValidField={hasValidField}
          />
        </EuiFlexGroup>
      </EuiFlexItem>
      {!isManagedAiConnectorCalloutDismissed && isManagedAIConnector && (
        <EuiCallOut onDismiss={onDismissManagedAiConnectorCallout}>
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.managedConnectorTooltip',
            {
              defaultMessage:
                'Generating patterns is powered by a preconfigured LLM. Additional charges apply',
            }
          )}
        </EuiCallOut>
      )}
    </>
  );
}

export function GrokAiSuggestions() {
  const {
    core: { http },
  } = useKibana();
  const { enabled: isAiEnabled, couldBeEnabled, genAiConnectors } = useAIFeatures();
  const previewDocuments = useSimulatorSelector((snapshot) =>
    selectPreviewDocuments(snapshot.context)
  );

  if (!isAiEnabled && couldBeEnabled) {
    return (
      <EuiToolTip
        content={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.aiAssistantNotEnabledTooltip',
          {
            defaultMessage:
              'AI Assistant features are not enabled. To enable features, add an AI connector on the management page.',
          }
        )}
      >
        <EuiLink
          target="_blank"
          href={http!.basePath.prepend(
            `/app/management/insightsAndAlerting/triggersActionsConnectors/connectors`
          )}
        >
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.aiAssistantNotEnabled',
            { defaultMessage: 'Enable AI Assistant features' }
          )}
        </EuiLink>
      </EuiToolTip>
    );
  }

  if (!isAiEnabled) {
    return null;
  }

  return (
    <InnerGrokAiSuggestions previewDocuments={previewDocuments} genAiConnectors={genAiConnectors} />
  );
}
