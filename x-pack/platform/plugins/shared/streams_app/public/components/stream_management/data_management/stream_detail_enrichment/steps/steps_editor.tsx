/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiAccordion,
  EuiCallOut,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { isEmpty } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { flattenObjectNestedLast } from '@kbn/object-utils';
import type { FlattenRecord } from '@kbn/streams-schema';
import { validationErrorTypeLabels } from '@kbn/streamlang';
import { useAIFeatures } from '../../../../../hooks/use_ai_features';
import { useStreamDetail } from '../../../../../hooks/use_stream_detail';
import { GenerateSuggestionButton } from '../../stream_detail_routing/review_suggestions_form/generate_suggestions_button';
import { AdditionalChargesCallout } from '../../shared/additional_charges_callout';
import { NoStepsEmptyPrompt } from '../empty_prompts';
import { PipelineSuggestion } from '../pipeline_suggestions/pipeline_suggestion';
import {
  useSimulatorSelector,
  useStreamEnrichmentSelector,
  useStreamEnrichmentEvents,
  useInteractiveModeSelector,
} from '../state_management/stream_enrichment_state_machine';
import { selectValidationErrors } from '../state_management/stream_enrichment_state_machine/selectors';
import { getActiveDataSourceRef } from '../state_management/stream_enrichment_state_machine/utils';
import { hasValidMessageFieldsForSuggestion } from '../utils';
import { RootSteps } from './root_steps';
import { SuggestionLoadingPrompt } from '../../shared/suggestion_loading_prompt';

const clampTwoLines = css`
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const calloutTitleWeight = css`
  font-weight: 450;
`;

const ErrorPanel = React.memo(() => {
  const simulation = useSimulatorSelector((snapshot) => snapshot.context.simulation);

  const validationErrors = useStreamEnrichmentSelector((state) =>
    selectValidationErrors(state.context)
  );

  const allValidationErrors = useMemo(() => {
    return Array.from(validationErrors.values()).flat();
  }, [validationErrors]);

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

  const hasValidationErrors = !isEmpty(allValidationErrors);
  const hasSimulationErrors =
    !isEmpty(errors.ignoredFields) || !isEmpty(errors.mappingFailures) || errors.definition_error;
  const hasAnyErrors = hasValidationErrors || hasSimulationErrors;

  if (!hasAnyErrors) {
    return null;
  }

  const errorCount =
    allValidationErrors.length +
    (errors.definition_error ? 1 : 0) +
    (errors.ignoredFields.length > 0 ? 1 : 0) +
    (errors.mappingFailures.length > 0 ? 1 : 0);

  return (
    <EuiPanel paddingSize="m" grow={false} hasBorder={true}>
      <EuiAccordion
        id="error-panel-accordion"
        buttonContent={
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem>
              <EuiIcon type="warningFill" color="danger" aria-hidden={true} />
            </EuiFlexItem>
            <EuiTextColor color="danger">
              <strong>
                {i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.errorPanel.title',
                  {
                    defaultMessage:
                      '{count, plural, one {# Validation error or issue} other {# Validation errors or issues}}',
                    values: { count: errorCount },
                  }
                )}
              </strong>
            </EuiTextColor>
          </EuiFlexGroup>
        }
      >
        <EuiFlexGroup gutterSize="s" direction="column">
          <EuiSpacer size="s" />
          {allValidationErrors.map((error, idx) => {
            const errorTypeLabel = validationErrorTypeLabels[error.type];
            return (
              <EuiCallOut key={idx} color="danger" size="s" title={errorTypeLabel}>
                {error.message}
              </EuiCallOut>
            );
          })}
          {errors.definition_error && (
            <EuiCallOut
              announceOnMount
              color="danger"
              size="s"
              title={i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.definitionError',
                { defaultMessage: 'Please fix this error before saving' }
              )}
            >
              {errors.definition_error.message}
            </EuiCallOut>
          )}
          {!isEmpty(errors.ignoredFields) && (
            <EuiPanel paddingSize="s" hasShadow={false} grow={false} color="danger">
              <EuiAccordion
                id="ignored-fields-failures-accordion"
                buttonContent={
                  <EuiTitle size="xxs" css={calloutTitleWeight}>
                    <h4>
                      <EuiTextColor color="danger">
                        {i18n.translate(
                          'xpack.streams.streamDetailView.managementTab.enrichment.ignoredFieldsFailure.title',
                          { defaultMessage: 'Malformed fields detected.' }
                        )}
                      </EuiTextColor>
                    </h4>
                  </EuiTitle>
                }
              >
                <EuiSpacer size="xs" />
                <EuiText size="xs">
                  <p>
                    <FormattedMessage
                      id="xpack.streams.streamDetailView.managementTab.enrichment.ignoredFieldsFailure.fieldsList"
                      defaultMessage="Some fields are malformed and won't be stored correctly: {fields}"
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
                buttonContent={
                  <EuiTitle size="xxs" css={calloutTitleWeight}>
                    <h4>
                      <EuiTextColor color="danger">
                        {i18n.translate(
                          'xpack.streams.streamDetailView.managementTab.enrichment.fieldMappingsFailure.title',
                          {
                            defaultMessage: 'Field conflicts during simulation',
                          }
                        )}
                      </EuiTextColor>
                    </h4>
                  </EuiTitle>
                }
              >
                <EuiSpacer size="xs" />
                <EuiText size="xs">
                  <p>
                    <FormattedMessage
                      id="xpack.streams.streamDetailView.managementTab.enrichment.fieldMappingsFailure.fieldsList"
                      defaultMessage="These are some mapping failures that occurred during the simulation:"
                    />
                  </p>
                  <ul>
                    {errors.mappingFailures.map((failureMessage, id) => (
                      <li key={id}>
                        <EuiText css={clampTwoLines} size="xs">
                          {failureMessage}
                        </EuiText>
                      </li>
                    ))}
                  </ul>
                </EuiText>
              </EuiAccordion>
            </EuiPanel>
          )}
        </EuiFlexGroup>
      </EuiAccordion>
    </EuiPanel>
  );
});

export const StepsEditor = React.memo(() => {
  const stepRefs = useInteractiveModeSelector((state) => state.context.stepRefs);
  const samples = useSimulatorSelector((snapshot) => snapshot.context.samples);
  const isLoadingSamples = useStreamEnrichmentSelector((state) =>
    getActiveDataSourceRef(state.context.dataSourcesRefs)
      ?.getSnapshot()
      .matches({ enabled: 'loadingData' })
  );

  // Pipeline suggestion state
  const isLoadingSuggestion = useInteractiveModeSelector((snapshot) =>
    snapshot.matches({ pipelineSuggestion: 'generatingSuggestion' })
  );
  const suggestedPipeline = useInteractiveModeSelector(
    (snapshot) => snapshot.context.suggestedPipeline
  );
  const isViewingSuggestion = useInteractiveModeSelector((snapshot) =>
    snapshot.matches({ pipelineSuggestion: 'viewingSuggestion' })
  );
  const isNoSuggestionsFound = useInteractiveModeSelector((snapshot) =>
    snapshot.matches({ pipelineSuggestion: 'noSuggestionsFound' })
  );

  // Pipeline suggestion events
  const { suggestPipeline, clearSuggestedSteps, cancelSuggestion, acceptSuggestion } =
    useStreamEnrichmentEvents();

  // Check if samples have valid message fields for pipeline suggestion
  const hasValidMessageFields = useMemo(() => {
    const flattenedSamples = samples.map(
      (sample) => flattenObjectNestedLast(sample.document) as FlattenRecord
    );
    return hasValidMessageFieldsForSuggestion(flattenedSamples);
  }, [samples]);

  const hasSteps = !isEmpty(stepRefs);

  const aiFeatures = useAIFeatures();
  const {
    definition: { stream },
  } = useStreamDetail();

  const canUsePipelineSuggestions = aiFeatures && aiFeatures.enabled && hasValidMessageFields;
  const canUsePipelineSuggestionsPending =
    aiFeatures !== null && (aiFeatures.loading || (aiFeatures.enabled && isLoadingSamples));

  if (aiFeatures && aiFeatures.enabled) {
    if (isLoadingSuggestion) {
      return (
        <SuggestionLoadingPrompt
          onCancel={() => {
            cancelSuggestion();
          }}
        />
      );
    }

    if (isNoSuggestionsFound) {
      return (
        <NoStepsEmptyPrompt canUsePipelineSuggestions={!!canUsePipelineSuggestions}>
          <div css={{ maxWidth: 400, margin: '0 auto', textAlign: 'left' }}>
            <EuiCallOut
              announceOnMount
              title={i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.pipelineSuggestion.noSuggestionsTitle',
                { defaultMessage: 'Could not generate suggestions' }
              )}
              color="primary"
              size="s"
              onDismiss={() => clearSuggestedSteps()}
            >
              <p>
                {i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.pipelineSuggestion.noSuggestionsDescription',
                  {
                    defaultMessage:
                      'The AI assistant was unable to generate pipeline suggestions for your data. You can try again.',
                  }
                )}
              </p>
              <EuiSpacer size="s" />
              <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
                <EuiFlexItem grow={false}>
                  <GenerateSuggestionButton
                    aiFeatures={aiFeatures}
                    iconType="refresh"
                    size="s"
                    onClick={(connectorId) =>
                      suggestPipeline({ connectorId, streamName: stream.name })
                    }
                    isLoading={false}
                  >
                    {i18n.translate('xpack.streams.stepsEditor.tryAgainButtonLabel', {
                      defaultMessage: 'Try again',
                    })}
                  </GenerateSuggestionButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiCallOut>
          </div>
        </NoStepsEmptyPrompt>
      );
    }

    if (suggestedPipeline && isViewingSuggestion) {
      return (
        <PipelineSuggestion
          aiFeatures={aiFeatures}
          onAccept={() => {
            // Just hide the suggestion panel, keep the steps
            acceptSuggestion();
          }}
          onDismiss={() => {
            // Remove suggested steps and hide panel
            clearSuggestedSteps();
          }}
          onRegenerate={(connectorId) => {
            // Remove current suggested steps before regenerating
            clearSuggestedSteps();
            suggestPipeline({ connectorId, streamName: stream.name });
          }}
        />
      );
    }
  }

  return (
    <>
      {hasSteps ? (
        <RootSteps stepRefs={stepRefs} />
      ) : // hold off rendering empty prompt while there is a chance we will show the pipeline suggestion prompt
      !canUsePipelineSuggestions && canUsePipelineSuggestionsPending ? null : (
        <NoStepsEmptyPrompt canUsePipelineSuggestions={!!canUsePipelineSuggestions}>
          {canUsePipelineSuggestions && (
            <>
              <GenerateSuggestionButton
                aiFeatures={aiFeatures}
                isLoading={isLoadingSuggestion}
                onClick={(connectorId) => suggestPipeline({ connectorId, streamName: stream.name })}
              >
                {i18n.translate('xpack.streams.stepsEditor.suggestPipelineButtonLabel', {
                  defaultMessage: 'Suggest a pipeline',
                })}
              </GenerateSuggestionButton>
              {aiFeatures.isManagedAIConnector && !aiFeatures.hasAcknowledgedAdditionalCharges && (
                <>
                  <EuiSpacer size="s" />
                  <AdditionalChargesCallout aiFeatures={aiFeatures} />
                </>
              )}
            </>
          )}
        </NoStepsEmptyPrompt>
      )}
      <EuiSpacer size="m" />
      <ErrorPanel />
    </>
  );
});
