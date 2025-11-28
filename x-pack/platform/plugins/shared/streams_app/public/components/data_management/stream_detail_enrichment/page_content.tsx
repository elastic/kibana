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
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { css } from '@emotion/react';
import { isEmpty } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { Streams } from '@kbn/streams-schema';
import { useKbnUrlStateStorageFromRouterContext } from '../../../util/kbn_url_state_context';
import { useKibana } from '../../../hooks/use_kibana';
import { ManagementBottomBar } from '../management_bottom_bar';
import { SimulationPlayground } from './simulation_playground';
import {
  StreamEnrichmentContextProvider,
  useSimulatorSelector,
  useStreamEnrichmentEvents,
  useStreamEnrichmentSelector,
  useGetStreamEnrichmentState,
} from './state_management/stream_enrichment_state_machine';
import { NoStepsEmptyPrompt } from './empty_prompts';
import { RootSteps } from './steps/root_steps';
import { StreamsAppContextProvider } from '../../streams_app_context_provider';
import { getStreamTypeFromDefinition } from '../../../util/get_stream_type_from_definition';
import { SchemaChangesReviewModal, getChanges } from '../schema_editor/schema_changes_review_modal';
import { getDefinitionFields } from '../schema_editor/hooks/use_schema_fields';
import { selectFieldsInSamples } from './state_management/simulation_state_machine/selectors';
import type { SchemaEditorField } from '../schema_editor/types';
import { isFieldUncommitted } from '../schema_editor/utils';

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
  const getEnrichmentState = useGetStreamEnrichmentState();
  const fieldsInSamples = useSimulatorSelector((state) =>
    selectFieldsInSamples(state.context, getEnrichmentState().context)
  );

  // Calculate schemaEditorFields with result property
  const schemaEditorFields = React.useMemo(() => {
    // Create lookup maps for efficient comparison
    const definitionFieldsMap = new Map(definitionFields.map((field) => [field.name, field]));

    // Convert definitionFields to SchemaEditorField[] for uncommitted comparison
    const storedFields: SchemaEditorField[] = Array.from(definitionFieldsMap.values());

    const result: SchemaEditorField[] = [];

    // Create a set of field names in samples for quick lookup
    const fieldsInSamplesSet = new Set(fieldsInSamples);

    // Process only detected fields
    detectedFields.forEach((detectedField) => {
      const definitionField = definitionFieldsMap.get(detectedField.name);
      const isInSamples = fieldsInSamplesSet.has(detectedField.name);
      let fieldResult: SchemaEditorField['result'];

      if (isInSamples) {
        // Field exists in samples AND in detected fields - modified by the simulated processing steps
        fieldResult = 'modified';
      } else {
        // Field not in samples - newly created by the processing steps
        fieldResult = 'created';
      }

      let editorField: SchemaEditorField;

      // If the detected field matches an inherited field, preserve the inherited properties
      if (definitionField) {
        // Merge with definition field to preserve any additional properties
        editorField = {
          ...definitionField,
          ...detectedField,
          result: fieldResult,
        };
      } else {
        editorField = {
          ...detectedField,
          result: fieldResult,
        };
      }

      // Mark field as uncommitted if it's new or modified from stored state
      editorField.uncommitted = isFieldUncommitted(editorField, storedFields);

      result.push(editorField);
    });

    return result;
  }, [detectedFields, fieldsInSamples, definitionFields]);

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
            fields={schemaEditorFields}
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
                <MemoSimulationPlayground schemaEditorFields={schemaEditorFields} />
              </EuiResizablePanel>
            </>
          )}
        </EuiResizableContainer>
      </EuiSplitPanel.Inner>
      {hasChanges && (
        <ManagementBottomBar
          onCancel={resetChanges}
          onConfirm={
            schemaEditorFields.length > 0 &&
            getChanges(schemaEditorFields, definitionFields).length > 0
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

  return (
    <>
      {hasSteps ? <RootSteps stepRefs={stepRefs} /> : <NoStepsEmptyPrompt />}
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
