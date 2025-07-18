/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { APIReturnType } from '@kbn/streams-plugin/public/api';
import { ValuesType } from 'utility-types';
import { GrokCollection, DraftGrokExpression } from '@kbn/grok-ui';
import { UseFormSetValue, FieldValues, useWatch } from 'react-hook-form';
import { useStreamDetail } from '../../../../../hooks/use_stream_detail';
import { selectPreviewRecords } from '../../state_management/simulation_state_machine/selectors';
import { useSimulatorSelector } from '../../state_management/stream_enrichment_state_machine';
import { ProcessorFormState } from '../../types';
import { GeneratePatternButton, AdditionalChargesCallout } from './generate_pattern_button';
import { useGrokPatternSuggestion } from './use_grok_pattern_suggestion';
import { AIFeatures } from './use_ai_features';

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
}): React.ReactElement => {
  const {
    definition: { stream },
  } = useStreamDetail();

  const previewDocuments = useSimulatorSelector((snapshot) =>
    selectPreviewRecords(snapshot.context)
  );

  const [suggestionsState, refreshSuggestions] = useGrokPatternSuggestion();

  const fieldValue = useWatch<ProcessorFormState, 'field'>({ name: 'field' });
  const isValidField = useMemo(() => {
    return Boolean(
      fieldValue &&
        previewDocuments.some(
          (sample) => sample[fieldValue] && typeof sample[fieldValue] === 'string'
        )
    );
  }, [previewDocuments, fieldValue]);

  if (suggestionsState.value && suggestionsState.value[0]) {
    return (
      <GrokPatternSuggestion
        suggestion={suggestionsState.value[0]}
        onAccept={() => {
          const [suggestion] = suggestionsState.value ?? [];
          if (suggestion) {
            setValue(
              'patterns',
              suggestion.grokProcessor.patterns.map(
                (value) => new DraftGrokExpression(grokCollection, value)
              )
            );
            setValue('pattern_definitions', suggestion.grokProcessor.pattern_definitions);
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
              onClick={(connectorId) =>
                refreshSuggestions({
                  connectorId,
                  streamName: stream.name,
                  samples: previewDocuments,
                  fieldName: fieldValue,
                })
              }
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
          {/* <AddPatternButton onClick={onAddPattern} isDisabled={suggestionsState.loading} /> */}
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
  suggestion: ValuesType<APIReturnType<'POST /internal/streams/{name}/processing/_suggestions'>>;
  onAccept(): void;
  onDismiss(): void;
}

export function GrokPatternSuggestion({
  suggestion,
  onAccept,
  onDismiss,
}: GrokPatternSuggestionProps) {
  const processorMetrics = suggestion.simulationResult.processors_metrics['grok-processor'];
  return (
    <EuiCallOut
      iconType="sparkles"
      title={suggestion.description}
      color="primary"
      size="s"
      onDismiss={onDismiss}
    >
      {suggestion.grokProcessor.patterns.map((pattern, index) => (
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
          <EuiButton iconType="check" onClick={onAccept} color="primary" size="s">
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
