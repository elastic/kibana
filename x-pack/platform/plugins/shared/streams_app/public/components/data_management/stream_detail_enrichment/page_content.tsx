/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiAccordion,
  EuiCode,
  EuiPanel,
  EuiResizableContainer,
  EuiSplitPanel,
  EuiTitle,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { css } from '@emotion/react';
import { isEmpty } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { useAbortController } from '@kbn/react-hooks';
import { useKbnUrlStateStorageFromRouterContext } from '../../../util/kbn_url_state_context';
import { useKibana } from '../../../hooks/use_kibana';
import { ManagementBottomBar } from '../management_bottom_bar';
import { SimulationPlayground } from './simulation_playground';
import {
  StreamEnrichmentContextProvider,
  useSimulatorSelector,
  useStreamEnrichmentEvents,
  useStreamEnrichmentSelector,
} from './state_management/stream_enrichment_state_machine';
import { NoStepsEmptyPrompt } from './empty_prompts';
import { RootSteps } from './steps/root_steps';
import { StreamsAppContextProvider } from '../../streams_app_context_provider';
import { getStreamTypeFromDefinition } from '../../../util/get_stream_type_from_definition';
import { SchemaChangesReviewModal, getChanges } from '../schema_editor/schema_changes_review_modal';
import { getDefinitionFields } from '../schema_editor/hooks/use_schema_fields';
import { useAIFeatures } from '../../../hooks/use_ai_features';
import { useSuggestProcessingPipeline } from './processing_pipeline_suggestions/use_suggest_processing_pipeline';
import { GenerateSuggestionButton } from '../stream_detail_routing/review_suggestions_form/generate_suggestions_button';
import { useStreamDetail } from '../../../hooks/use_stream_detail';
import { ProcessingPipelineSuggestion } from './processing_pipeline_suggestions/processing_pipeline_suggestion';
import { LoadingPrompt } from './processing_pipeline_suggestions/loading_prompt';

const MemoSimulationPlayground = React.memo(SimulationPlayground);

interface StreamDetailEnrichmentContentProps {
  definition: Streams.ingest.all.GetResponse;
  refreshDefinition: () => void;
}

export function StreamDetailEnrichmentContent(props: StreamDetailEnrichmentContentProps) {
  const {
    core,
    dependencies,
    services: { telemetryClient },
  } = useKibana();
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
      telemetryClient={telemetryClient}
    >
      <StreamDetailEnrichmentContentImpl />
    </StreamEnrichmentContextProvider>
  );
}

export function StreamDetailEnrichmentContentImpl() {
  const context = useKibana();
  const { appParams, core } = context;

  const { resetChanges, saveChanges } = useStreamEnrichmentEvents();

  const isReady = useStreamEnrichmentSelector((state) => state.matches('ready'));
  const definition = useStreamEnrichmentSelector((state) => state.context.definition);
  const canUpdate = useStreamEnrichmentSelector((state) => state.can({ type: 'stream.update' }));
  const detectedFields = useSimulatorSelector((state) => state.context.detectedSchemaFields);
  const isSimulating = useSimulatorSelector((state) => state.matches('runningSimulation'));
  const definitionFields = React.useMemo(() => getDefinitionFields(definition), [definition]);
  const hasDefinitionError = useSimulatorSelector((snapshot) =>
    Boolean(snapshot.context.simulation?.definition_error)
  );

  const canManage = useStreamEnrichmentSelector(
    (state) => state.context.definition.privileges.manage
  );
  const isSavingChanges = useStreamEnrichmentSelector((state) =>
    state.matches({ ready: { stream: 'updating' } })
  );

  const hasChanges = canUpdate && !isSimulating;

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

  const openConfirmationModal = () => {
    const overlay = core.overlays.openModal(
      toMountPoint(
        <StreamsAppContextProvider context={context}>
          <SchemaChangesReviewModal
            fields={detectedFields}
            streamType={getStreamTypeFromDefinition(definition.stream)}
            definition={definition}
            storedFields={definitionFields}
            submitChanges={async () => saveChanges()}
            onClose={() => overlay.close()}
          />
        </StreamsAppContextProvider>,
        core
      ),
      {
        maxWidth: 500,
      }
    );
  };

  return (
    <EuiSplitPanel.Outer grow hasShadow={false}>
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
                paddingSize="l"
                css={verticalFlexCss}
              >
                <StepsEditor />
              </EuiResizablePanel>
              <EuiResizableButton indicator="border" />
              <EuiResizablePanel
                initialSize={60}
                minSize="300px"
                tabIndex={0}
                paddingSize="l"
                css={verticalFlexCss}
              >
                <MemoSimulationPlayground />
              </EuiResizablePanel>
            </>
          )}
        </EuiResizableContainer>
      </EuiSplitPanel.Inner>
      {hasChanges && (
        <ManagementBottomBar
          onCancel={resetChanges}
          onConfirm={
            detectedFields.length > 0 && getChanges(detectedFields, definitionFields).length > 0
              ? openConfirmationModal
              : saveChanges
          }
          isLoading={isSavingChanges}
          disabled={!hasChanges}
          insufficientPrivileges={!canManage}
          isInvalid={hasDefinitionError}
        />
      )}
    </EuiSplitPanel.Outer>
  );
}

const StepsEditor = React.memo(() => {
  const { reassignSteps } = useStreamEnrichmentEvents();
  const stepRefs = useStreamEnrichmentSelector((state) => state.context.stepRefs);
  const simulation = useSimulatorSelector((snapshot) => snapshot.context.simulation);

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

  const abortController = useAbortController();
  const aiFeatures = useAIFeatures();
  const [suggestionsState, suggestPipeline] = useSuggestProcessingPipeline(abortController);
  const {
    definition: { stream },
  } = useStreamDetail();

  if (aiFeatures && aiFeatures.enabled) {
    if (suggestionsState.loading) {
      return (
        <LoadingPrompt
          onCancel={() => {
            abortController.abort();
            abortController.refresh();
          }}
        />
      );
    }

    if (suggestionsState.value) {
      return (
        <ProcessingPipelineSuggestion
          aiFeatures={aiFeatures}
          pipeline={suggestionsState.value}
          onAccept={() => {
            reassignSteps(suggestionsState.value.steps);
            suggestPipeline(null);
          }}
          onDismiss={() => suggestPipeline(null)}
          onRegenerate={(connectorId) => {
            suggestPipeline({
              connectorId,
              streamName: stream.name,
              fieldName: 'body.text',
            });
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
          {aiFeatures && aiFeatures.enabled && (
            <EuiPanel
              hasBorder
              grow={false}
              css={css`
                text-align: left;
              `}
            >
              <EuiTitle size="xxs">
                <h5>
                  {i18n.translate('xpack.streams.stepsEditor.h3.suggestAPipelineLabel', {
                    defaultMessage: 'Suggest a pipeline',
                  })}
                </h5>
              </EuiTitle>
              <EuiText size="s">
                {i18n.translate('xpack.streams.stepsEditor.useThePowerOfTextLabel', {
                  defaultMessage: 'Use the power of AI to generate the most effective pipeline',
                })}
              </EuiText>
              <EuiSpacer size="m" />
              <GenerateSuggestionButton
                aiFeatures={aiFeatures}
                onClick={(connectorId) => {
                  suggestPipeline({
                    connectorId,
                    streamName: stream.name,
                    fieldName: 'body.text',
                  });
                }}
                isLoading={suggestionsState.loading}
              >
                {i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.refreshSuggestions',
                  {
                    defaultMessage: 'Suggest pipeline',
                  }
                )}
              </GenerateSuggestionButton>
            </EuiPanel>
          )}
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
