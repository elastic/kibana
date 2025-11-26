/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiAccordion, EuiCode, EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { isEmpty } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { flattenObjectNestedLast } from '@kbn/object-utils';
import type { FlattenRecord } from '@kbn/streams-schema';
import {
  useSimulatorSelector,
  useStreamEnrichmentSelector,
} from './state_management/stream_enrichment_state_machine';
import { hasValidMessageFieldsForSuggestion } from './utils';
import { NoStepsEmptyPrompt } from './empty_prompts';
import { RootSteps } from './steps/root_steps';
import { useAIFeatures } from '../../../hooks/use_ai_features';
import type { useSuggestPipeline } from './state_management/stream_enrichment_state_machine/use_pipeline_suggestions';
import { GenerateSuggestionButton } from '../stream_detail_routing/review_suggestions_form/generate_suggestions_button';
import { useStreamDetail } from '../../../hooks/use_stream_detail';
import { PipelineSuggestion } from './pipeline_suggestions/pipeline_suggestion';
import { SuggestPipelineLoadingPrompt } from './pipeline_suggestions/suggest_pipeline_loading_prompt';
import { SuggestPipelinePanel } from './pipeline_suggestions/suggest_pipeline_panel';

export interface StepsEditorProps {
  suggestionState: ReturnType<typeof useSuggestPipeline>;
}

export const StepsEditor = React.memo(({ suggestionState }: StepsEditorProps) => {
  const stepRefs = useStreamEnrichmentSelector((state) => state.context.stepRefs);
  const simulation = useSimulatorSelector((snapshot) => snapshot.context.simulation);
  const samples = useSimulatorSelector((snapshot) => snapshot.context.samples);

  // Check if samples have valid message fields for pipeline suggestion
  const hasValidMessageFields = useMemo(() => {
    const flattenedSamples = samples.map(
      (sample) => flattenObjectNestedLast(sample.document) as FlattenRecord
    );
    return hasValidMessageFieldsForSuggestion(flattenedSamples);
  }, [samples]);

  const errors = useMemo(() => {
    if (!simulation) {
      return { ignoredFields: [], mappingFailures: [], definition_error: undefined };
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
      definition_error: simulation.definition_error,
    };
  }, [simulation]);

  const hasSteps = !isEmpty(stepRefs);

  const aiFeatures = useAIFeatures();
  const {
    definition: { stream },
  } = useStreamDetail();

  if (aiFeatures && aiFeatures.enabled) {
    if (suggestionState.state.loading) {
      return (
        <SuggestPipelineLoadingPrompt
          onCancel={() => {
            suggestionState.cancelSuggestion();
          }}
        />
      );
    }

    if (suggestionState.state.value && suggestionState.showSuggestion) {
      return (
        <PipelineSuggestion
          aiFeatures={aiFeatures}
          pipeline={suggestionState.state.value}
          onAccept={() => {
            // Just hide the suggestion panel, keep the steps
            suggestionState.setShowSuggestion(false);
          }}
          onDismiss={() => {
            // Remove suggested steps and hide panel
            suggestionState.clearSuggestedSteps();
          }}
          onRegenerate={(connectorId) => {
            // Remove current suggested steps before regenerating
            suggestionState.clearSuggestedSteps();
            suggestionState.suggestPipeline({ connectorId, streamName: stream.name });
          }}
        />
      );
    }
  }

  return (
    <>
      {hasSteps ? (
        <RootSteps stepRefs={stepRefs} />
      ) : (
        <NoStepsEmptyPrompt>
          {aiFeatures && aiFeatures.enabled && hasValidMessageFields ? (
            <SuggestPipelinePanel>
              <GenerateSuggestionButton
                aiFeatures={aiFeatures}
                isLoading={suggestionState.state.loading}
                onClick={(connectorId) =>
                  suggestionState.suggestPipeline({ connectorId, streamName: stream.name })
                }
              >
                {i18n.translate('xpack.streams.stepsEditor.suggestPipelineButtonLabel', {
                  defaultMessage: 'Suggest a pipeline',
                })}
              </GenerateSuggestionButton>
            </SuggestPipelinePanel>
          ) : null}
        </NoStepsEmptyPrompt>
      )}
      {(!isEmpty(errors.ignoredFields) ||
        !isEmpty(errors.mappingFailures) ||
        errors.definition_error) && (
        <EuiPanel paddingSize="m" hasShadow={false} grow={false}>
          {errors.definition_error && (
            <EuiPanel paddingSize="s" hasShadow={false} grow={false} color="danger">
              <EuiText size="s">
                <p>
                  <FormattedMessage
                    id="xpack.streams.streamDetailView.managementTab.enrichment.definitionError"
                    defaultMessage="Please fix this error before saving: {error}"
                    values={{ error: errors.definition_error.message }}
                  />
                </p>
              </EuiText>
            </EuiPanel>
          )}
          {!isEmpty(errors.ignoredFields) && (
            <EuiPanel paddingSize="s" hasShadow={false} grow={false} color="danger">
              <EuiAccordion
                id="ignored-fields-failures-accordion"
                initialIsOpen
                buttonContent={
                  <strong>
                    {i18n.translate(
                      'xpack.streams.streamDetailView.managementTab.enrichment.ignoredFieldsFailure.title',
                      { defaultMessage: 'Malformed fields detected.' }
                    )}
                  </strong>
                }
              >
                <EuiText component="p" size="s">
                  <p>
                    <FormattedMessage
                      id="xpack.streams.streamDetailView.managementTab.enrichment.ignoredFieldsFailure.fieldsList"
                      defaultMessage="Some fields are malformed and won’t be stored correctly: {fields}"
                      values={{
                        fields: errors.ignoredFields.map((field) => (
                          <>
                            <EuiCode key={field}>{field}</EuiCode>{' '}
                          </>
                        )),
                      }}
                    />
                  </p>
                  <p>
                    {i18n.translate(
                      'xpack.streams.streamDetailView.managementTab.enrichment.ignoredFieldsFailure.causesLabel',
                      {
                        defaultMessage:
                          'This can happen due to type mismatches or fields exceeding configured limits.',
                      }
                    )}
                  </p>
                  <p>
                    {i18n.translate(
                      'xpack.streams.streamDetailView.managementTab.enrichment.ignoredFieldsFailure.suggestionsLabel',
                      {
                        defaultMessage:
                          'Check your field mappings, add processors to normalize values, or remove the conflicting fields.',
                      }
                    )}
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
      )}
    </>
  );
});

const clampTwoLines = css`
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
`;
