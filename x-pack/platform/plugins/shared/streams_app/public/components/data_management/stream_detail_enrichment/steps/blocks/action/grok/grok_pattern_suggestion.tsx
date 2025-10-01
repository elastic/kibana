/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiBadgeGroup,
  EuiBadge,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { GrokCollection } from '@kbn/grok-ui';
import { DraftGrokExpression } from '@kbn/grok-ui';
import type { UseFormSetValue, FieldValues } from 'react-hook-form';
import { useWatch } from 'react-hook-form';
import type { GrokProcessorResult } from '@kbn/grok-heuristics';
import type { APIReturnType } from '@kbn/streams-plugin/public/api';
import { useStreamDetail } from '../../../../../../../hooks/use_stream_detail';
import { selectPreviewRecords } from '../../../../state_management/simulation_state_machine/selectors';
import { useSimulatorSelector } from '../../../../state_management/stream_enrichment_state_machine';
import type { ProcessorFormState } from '../../../../types';
import { GeneratePatternButton, AdditionalChargesCallout } from './generate_pattern_button';
import { useGrokPatternSuggestion } from './use_grok_pattern_suggestion';
import type { AIFeatures } from '../../../../../../../hooks/use_ai_features';

export const GrokPatternAISuggestions = ({
  aiFeatures,
  grokCollection,
  setValue,
  onAddPattern,
}: {
  aiFeatures: AIFeatures;
  grokCollection: GrokCollection;
  setValue: UseFormSetValue<FieldValues>;
  onAddPattern: () => void;
}) => {
  const {
    definition: { stream },
  } = useStreamDetail();

  const previewDocuments = useSimulatorSelector((snapshot) =>
    selectPreviewRecords(snapshot.context)
  );

  const [suggestionsState, refreshSuggestions] = useGrokPatternSuggestion();

  const fieldValue = useWatch<ProcessorFormState, 'from'>({ name: 'from' });
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
      <GrokPatternSuggestion
        grokProcessor={suggestionsState.value.grokProcessor}
        simulationResult={suggestionsState.value.simulationResult}
        onAccept={() => {
          if (suggestionsState.value) {
            setValue(
              'patterns',
              suggestionsState.value.grokProcessor.patterns.map(
                (value) => new DraftGrokExpression(grokCollection, value)
              ),
              { shouldValidate: true }
            );
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
            <GeneratePatternButton
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
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="streamsAppGrokPatternsEditorAddPatternButton"
            flush="left"
            size="s"
            onClick={onAddPattern}
            isDisabled={suggestionsState.loading}
          >
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processor.grokEditor.addPattern',
              { defaultMessage: 'Add pattern' }
            )}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      {aiFeatures &&
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

export interface GrokPatternSuggestionProps {
  grokProcessor: GrokProcessorResult;
  simulationResult: APIReturnType<'POST /internal/streams/{name}/processing/_simulate'>;
  onAccept(): void;
  onDismiss(): void;
}

export function GrokPatternSuggestion({
  grokProcessor,
  simulationResult,
  onAccept,
  onDismiss,
}: GrokPatternSuggestionProps) {
  const processorMetrics = simulationResult.processors_metrics['grok-processor'];
  return (
    <EuiCallOut
      iconType="sparkles"
      title={grokProcessor.description}
      color="primary"
      size="s"
      onDismiss={onDismiss}
    >
      {grokProcessor.patterns.map((pattern, index) => (
        <EuiCodeBlock key={pattern} paddingSize="none" language="regex" transparentBackground>
          {pattern}
        </EuiCodeBlock>
      ))}
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
                'xpack.streams.streamDetailView.managementTab.enrichment.grokPatternSuggestion.matchRateBadge',
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
                'xpack.streams.streamDetailView.managementTab.enrichment.grokPatternSuggestion.fieldCountBadge',
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
          <EuiButton iconType="check" onClick={onAccept} color="primary" size="s" fill>
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.grokPatternSuggestion.acceptButton',
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
