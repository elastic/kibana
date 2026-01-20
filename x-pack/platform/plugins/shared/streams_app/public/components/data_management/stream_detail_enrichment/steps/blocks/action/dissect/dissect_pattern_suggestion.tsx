/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiBadgeGroup,
  EuiBadge,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { UseFormSetValue, FieldValues } from 'react-hook-form';
import { useWatch } from 'react-hook-form';
import type { DissectProcessorResult } from '@kbn/dissect-heuristics';
import type { APIReturnType } from '@kbn/streams-plugin/public/api';
import { useAbortController } from '@kbn/react-hooks';
import { useStreamDetail } from '../../../../../../../hooks/use_stream_detail';
import { selectPreviewRecords } from '../../../../state_management/simulation_state_machine/selectors';
import { useSimulatorSelector } from '../../../../state_management/stream_enrichment_state_machine';
import type { ProcessorFormState } from '../../../../types';
import { AdditionalChargesCallout } from '../grok/additional_charges_callout';
import { GenerateSuggestionButton } from '../../../../../stream_detail_routing/review_suggestions_form/generate_suggestions_button';
import { useDissectPatternSuggestion } from './use_dissect_pattern_suggestion';
import type { AIFeatures } from '../../../../../../../hooks/use_ai_features';

export const DissectPatternAISuggestions = ({
  aiFeatures,
  setValue,
}: {
  aiFeatures: AIFeatures;
  setValue: UseFormSetValue<FieldValues>;
}) => {
  const {
    definition: { stream },
  } = useStreamDetail();

  const previewDocuments = useSimulatorSelector((snapshot) =>
    selectPreviewRecords(snapshot.context)
  );

  const abortController = useAbortController();
  const [suggestionsState, refreshSuggestions] = useDissectPatternSuggestion(abortController);

  const fieldValue = useWatch<ProcessorFormState, 'from'>({ name: 'from' }) as string;
  const isValidField = useMemo(() => {
    return Boolean(
      fieldValue &&
        previewDocuments.some(
          (sample) => sample[fieldValue] && typeof sample[fieldValue] === 'string'
        )
    );
  }, [previewDocuments, fieldValue]);

  if (suggestionsState.value) {
    return (
      <DissectPatternSuggestion
        dissectProcessor={suggestionsState.value.dissectProcessor}
        simulationResult={suggestionsState.value.simulationResult}
        onAccept={() => {
          if (suggestionsState.value) {
            setValue('pattern', suggestionsState.value.dissectProcessor.pattern, {
              shouldValidate: true,
            });
            // Set append_separator if the processor uses it
            if (suggestionsState.value.dissectProcessor.processor.dissect.append_separator) {
              setValue(
                'append_separator',
                suggestionsState.value.dissectProcessor.processor.dissect.append_separator,
                { shouldValidate: true }
              );
            }
          }
          refreshSuggestions(null);
        }}
        onDismiss={() => refreshSuggestions(null)}
      />
    );
  }

  return (
    <>
      <EuiFlexGroup gutterSize="l" alignItems="center">
        {aiFeatures.enabled && (
          <EuiFlexItem grow={false}>
            <GenerateSuggestionButton
              aiFeatures={aiFeatures}
              onClick={(connectorId) => {
                refreshSuggestions({
                  connectorId,
                  streamName: stream.name,
                  fieldName: fieldValue,
                });
              }}
              isLoading={suggestionsState.loading}
              isDisabled={!isValidField}
            >
              {i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.dissectProcessorFlyout.refreshSuggestions',
                {
                  defaultMessage: 'Generate pattern',
                }
              )}
            </GenerateSuggestionButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {aiFeatures &&
        aiFeatures.enabled &&
        aiFeatures.isManagedAIConnector &&
        !aiFeatures.hasAcknowledgedAdditionalCharges && (
          <>
            <EuiSpacer size="s" />
            <AdditionalChargesCallout aiFeatures={aiFeatures} />
          </>
        )}
    </>
  );
};

export interface DissectPatternSuggestionProps {
  dissectProcessor: DissectProcessorResult;
  simulationResult: APIReturnType<'POST /internal/streams/{name}/processing/_simulate'>;
  onAccept(): void;
  onDismiss(): void;
}

export function DissectPatternSuggestion({
  dissectProcessor,
  simulationResult,
  onAccept,
  onDismiss,
}: DissectPatternSuggestionProps) {
  const processorMetrics = simulationResult.processors_metrics['dissect-processor'];
  return (
    <EuiCallOut
      iconType="sparkles"
      title={dissectProcessor.description || 'Dissect pattern suggestion'}
      color="primary"
      size="s"
      onDismiss={onDismiss}
    >
      <EuiCodeBlock paddingSize="none" language="text" transparentBackground>
        {dissectProcessor.pattern}
      </EuiCodeBlock>
      <EuiFlexGroup
        gutterSize="m"
        responsive={false}
        wrap={false}
        alignItems="flexStart"
        direction="column"
      >
        <EuiFlexItem grow={false}>
          <EuiBadgeGroup>
            <EuiBadge color="hollow">
              {i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.dissectPatternSuggestion.matchRateBadge',
                {
                  defaultMessage: '{percentage}% Matched',
                  values: {
                    percentage: (processorMetrics.parsed_rate * 100).toFixed(),
                  },
                }
              )}
            </EuiBadge>
            <EuiBadge color="hollow">
              {i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.dissectPatternSuggestion.fieldCountBadge',
                {
                  defaultMessage: '{count} Fields',
                  values: {
                    count: processorMetrics.detected_fields.length,
                  },
                }
              )}
            </EuiBadge>
          </EuiBadgeGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            iconType="check"
            onClick={onAccept}
            color="primary"
            size="s"
            fill
            data-test-subj="streamsAppDissectSuggestionAcceptButton"
          >
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.dissectPatternSuggestion.acceptButton',
              {
                defaultMessage: 'Accept',
              }
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
}
