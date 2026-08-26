/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
  EuiLink,
  EuiPopover,
  EuiResizableContainer,
  EuiSplitPanel,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { Streams } from '@kbn/streams-schema';
import type { Pipeline } from '@kbn/ingest-pipelines-plugin/common/types';
import { isDraftStream } from '@kbn/streams-schema';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import React, { useCallback, useEffect, useState } from 'react';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { getStreamTypeFromDefinition } from '../../../../util/get_stream_type_from_definition';
import { useKbnUrlStateStorageFromRouterContext } from '../../../../util/kbn_url_state_context';
import { StreamsAppContextProvider } from '../../../streams_app_context_provider';
import { getDefinitionFields } from '../schema_editor/hooks/use_schema_fields';
import { SchemaChangesReviewModal, getChanges } from '../schema_editor/schema_changes_review_modal';
import type { SchemaEditorField } from '../schema_editor/types';
import { isFieldUncommitted } from '../schema_editor/utils';
import { EditModeToggle } from './edit_mode_toggle';
import { SimulationPlayground } from './simulation_playground';
import { stepUnderEditSelector } from './state_management/interactive_mode_machine/selectors';
import { selectFieldsInSamples } from './state_management/simulation_state_machine/selectors';
import {
  StreamEnrichmentContextProvider,
  useStreamEnrichmentSelector,
  useGetStreamEnrichmentState,
  useStreamEnrichmentEvents,
  useSimulatorSelector,
  useOptionalInteractiveModeSelector,
} from './state_management/stream_enrichment_state_machine';
import {
  selectStreamType,
  selectHasAnyErrors,
} from './state_management/stream_enrichment_state_machine/selectors';
import { StepsEditor } from './steps/steps_editor';
import { JsonEditorWrapper } from './json_mode/json_editor_wrapper';
import { RunSimulationButton } from './json_mode/run_simulation_button';
import { useRequestPreviewFlyoutState } from '../request_preview_flyout/use_request_preview_flyout_state';
import { useKibana } from '../../../../hooks/use_kibana';
import { useDiscardConfirm } from '../../../../hooks/use_discard_confirm';
import { RequestPreviewFlyout } from '../request_preview_flyout';
import {
  installDevConsoleHelpers,
  cleanupDevConsoleHelpers,
  collectStreamsSuggestionData,
} from './dev_console_helpers';
import type { ProcessingPersistenceAdapter } from './processing_persistence_adapter';

const MemoSimulationPlayground = React.memo(SimulationPlayground);

const ADD_TO_DATASET_ARIA_LABEL = i18n.translate('xpack.streams.enrichment.addToDatasetAriaLabel', {
  defaultMessage: 'Add enrichment suggestion to dataset',
});

interface StreamDetailEnrichmentContentProps {
  definition: Streams.ingest.all.GetResponse;
  pipeline: Pipeline;
  processingPersistenceAdapter: ProcessingPersistenceAdapter;
  refreshDefinition: () => void;
}

export function StreamDetailEnrichmentContent(props: StreamDetailEnrichmentContentProps) {
  return (
    <StreamDetailEnrichmentContentProvider {...props}>
      <StreamDetailEnrichmentContentImpl />
    </StreamDetailEnrichmentContentProvider>
  );
}

export function StreamDetailEnrichmentContentProvider({
  children,
  ...props
}: StreamDetailEnrichmentContentProps & { children: React.ReactNode }) {
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
      pipeline={props.pipeline}
      processingPersistenceAdapter={props.processingPersistenceAdapter}
      refreshDefinition={props.refreshDefinition}
      core={core}
      data={data}
      streamsRepositoryClient={streamsRepositoryClient}
      urlStateStorageContainer={urlStateStorageContainer}
      telemetryClient={telemetryClient}
    >
      {children}
    </StreamEnrichmentContextProvider>
  );
}

export function StreamDetailEnrichmentContentImpl() {
  const context = useKibana();
  const { euiTheme } = useEuiTheme();
  const { appParams, core } = context;
  const { onPageReady } = usePerformanceContext();

  const isReady = useStreamEnrichmentSelector((state) => state.matches('ready'));
  const hasJsonModeRef = useStreamEnrichmentSelector((state) => Boolean(state.context.jsonModeRef));
  const showJsonEditor = hasJsonModeRef;
  const definition = useStreamEnrichmentSelector((state) => state.context.definition);
  const detectedFields = useSimulatorSelector((state) => state.context.detectedSchemaFields);
  const definitionFields = React.useMemo(() => getDefinitionFields(definition), [definition]);
  const fieldsInSamples = useSimulatorSelector((state) => selectFieldsInSamples(state.context));

  // Install dev console helpers for debugging suggestions
  const simulatorRef = useStreamEnrichmentSelector((state) => state.context.simulatorRef);
  const interactiveModeRef = useStreamEnrichmentSelector(
    (state) => state.context.interactiveModeRef
  );

  useEffect(() => {
    installDevConsoleHelpers(
      () => simulatorRef.getSnapshot(),
      () => interactiveModeRef?.getSnapshot() ?? null
    );

    return () => {
      cleanupDevConsoleHelpers();
    };
  }, [simulatorRef, interactiveModeRef]);

  const evals = context.dependencies.start.evals;
  const onAddToDataset = useCallback(() => {
    if (!evals) return;
    const data = collectStreamsSuggestionData(
      () => simulatorRef.getSnapshot(),
      () => interactiveModeRef?.getSnapshot() ?? null
    );
    evals.openAddToDatasetFlyout({
      initialExample: {
        input: { raw_samples: data.raw_samples, suggestionType: data.suggestionType },
        output: { processed_samples: data.processed_samples, suggestion: data.suggestion },
        metadata: { source: 'streams_app_enrichment' },
      },
    });
  }, [evals, simulatorRef, interactiveModeRef]);

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

  // Telemetry for TTFMP (time to first meaningful paint)
  useEffect(() => {
    if (isReady && definition) {
      const streamType = getStreamTypeFromDefinition(definition.stream);
      onPageReady({
        meta: {
          description: `[ttfmp_streams_detail_processing] streamType: ${streamType}`,
        },
        customMetrics: {
          key1: 'schemaEditorFields',
          value1: schemaEditorFields.length,
        },
      });
    }
  }, [isReady, definition, onPageReady, schemaEditorFields.length]);

  const hasChanges = useStreamEnrichmentSelector((state) => state.context.hasChanges);

  const isWiredDraft = isDraftStream(definition.stream);

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

  return (
    <EuiSplitPanel.Outer grow hasShadow={false} css={fullHeightCss}>
      <EuiSplitPanel.Inner
        paddingSize="none"
        css={css`
          display: flex;
          min-height: 0;
          overflow: hidden;
        `}
      >
        <EuiResizableContainer css={fullHeightCss}>
          {(EuiResizablePanel, EuiResizableButton) => (
            <>
              <EuiResizablePanel
                initialSize={40}
                minSize="480px"
                tabIndex={0}
                paddingSize="none"
                css={[verticalFlexCss, fullHeightCss]}
              >
                <EuiFlexGroup
                  direction="column"
                  gutterSize="m"
                  css={css`
                    padding: ${euiTheme.size.l} ${euiTheme.size.l} ${euiTheme.size.l} 0;
                    height: 100%;
                  `}
                >
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup
                      gutterSize="s"
                      alignItems="center"
                      responsive={false}
                      justifyContent="spaceBetween"
                    >
                      <EuiFlexItem grow={false}>
                        <EditModeToggle />
                      </EuiFlexItem>
                      {isWiredDraft && (
                        <EuiFlexItem
                          grow={false}
                          data-test-subj="streamsAppProcessingDraftSimulationTipAnchor"
                        >
                          <DraftSimulationInfoPopover />
                        </EuiFlexItem>
                      )}
                      <EuiFlexItem grow />
                      {showJsonEditor && (
                        <EuiFlexItem grow={false}>
                          <RunSimulationButton />
                        </EuiFlexItem>
                      )}
                      {evals?.canAddToDataset && (
                        <EuiFlexItem grow={false}>
                          <EuiToolTip content={ADD_TO_DATASET_ARIA_LABEL} disableScreenReaderOutput>
                            <EuiButtonIcon
                              aria-label={ADD_TO_DATASET_ARIA_LABEL}
                              iconType="flask"
                              color="text"
                              onClick={onAddToDataset}
                              data-test-subj="streamsEnrichmentAddToDatasetButton"
                            />
                          </EuiToolTip>
                        </EuiFlexItem>
                      )}
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem grow style={{ minHeight: 0, overflow: 'auto' }}>
                    {showJsonEditor ? <JsonEditorWrapper /> : <StepsEditor />}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiResizablePanel>
              <EuiResizableButton indicator="border" />
              <EuiResizablePanel
                initialSize={60}
                minSize="300px"
                tabIndex={0}
                paddingSize="l"
                css={[verticalFlexCss, fullHeightCss]}
              >
                <MemoSimulationPlayground schemaEditorFields={schemaEditorFields} />
              </EuiResizablePanel>
            </>
          )}
        </EuiResizableContainer>
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
}

export function StreamDetailEnrichmentFooter() {
  const { euiTheme } = useEuiTheme();
  const context = useKibana();
  const { core } = context;
  const getStreamEnrichmentState = useGetStreamEnrichmentState();
  const { resetChanges, saveChanges } = useStreamEnrichmentEvents();
  const handleCancel = useDiscardConfirm(resetChanges, {
    title: discardUnsavedChangesTitle,
    message: discardUnsavedChangesMessage,
    confirmButtonText: discardUnsavedChangesLabel,
    cancelButtonText: keepEditingLabel,
  });
  const interactiveModeWithStepUnderEdit = useOptionalInteractiveModeSelector(
    (state) => Boolean(stepUnderEditSelector(state.context)),
    false
  );
  const isReady = useStreamEnrichmentSelector((state) => state.matches('ready'));
  const isSimulating = useSimulatorSelector((state) => state.matches('runningSimulation'));
  const definition = useStreamEnrichmentSelector((state) => state.context.definition);
  const processingPersistenceAdapter = useStreamEnrichmentSelector(
    (state) => state.context.processingPersistenceAdapter
  );
  const detectedFields = useSimulatorSelector((state) => state.context.detectedSchemaFields);
  const definitionFields = React.useMemo(() => getDefinitionFields(definition), [definition]);
  const fieldsInSamples = useSimulatorSelector((state) => selectFieldsInSamples(state.context));
  const hasDefinitionError = useSimulatorSelector((snapshot) =>
    Boolean(snapshot.context.simulation?.definition_error)
  );
  const canManage = useStreamEnrichmentSelector(
    (state) => state.context.definition.privileges.manage
  );
  const isSavingChanges = useStreamEnrichmentSelector((state) =>
    state.matches({ ready: { stream: 'updating' } })
  );
  const hasAnyErrors = useStreamEnrichmentSelector((state) => selectHasAnyErrors(state.context));
  const nextPipelineDefinition = useStreamEnrichmentSelector(
    (state) => state.context.nextPipelineDefinition
  );
  const hasChanges = useStreamEnrichmentSelector((state) => state.context.hasChanges);
  const streamType = useStreamEnrichmentSelector((snapshot) => selectStreamType(snapshot.context));
  const isSuggestionVisible = useOptionalInteractiveModeSelector(
    (snapshot) =>
      snapshot.matches({ pipelineSuggestion: 'generatingSuggestion' }) ||
      snapshot.matches({ pipelineSuggestion: 'viewingSuggestion' }) ||
      snapshot.matches({ pipelineSuggestion: 'noSuggestionsFound' }),
    false
  );
  const {
    isRequestPreviewFlyoutOpen,
    requestPreviewFlyoutCodeContent,
    openRequestPreviewFlyout,
    closeRequestPreviewFlyout,
  } = useRequestPreviewFlyoutState();

  const schemaEditorFields = React.useMemo(() => {
    const definitionFieldsMap = new Map(definitionFields.map((field) => [field.name, field]));
    const storedFields: SchemaEditorField[] = Array.from(definitionFieldsMap.values());
    const fieldsInSamplesSet = new Set(fieldsInSamples);

    return detectedFields.map((detectedField) => {
      const definitionField = definitionFieldsMap.get(detectedField.name);
      const editorField: SchemaEditorField = {
        ...(definitionField ?? {}),
        ...detectedField,
        result: fieldsInSamplesSet.has(detectedField.name) ? 'modified' : 'created',
      };
      editorField.uncommitted = isFieldUncommitted(editorField, storedFields);
      return editorField;
    });
  }, [detectedFields, fieldsInSamples, definitionFields]);
  const schemaChanges = React.useMemo(
    () => getChanges(schemaEditorFields, definitionFields),
    [schemaEditorFields, definitionFields]
  );
  const hasSchemaChanges = schemaChanges.length > 0;
  const canUpdate = useStreamEnrichmentSelector((state) =>
    state.can({ type: 'stream.update', saveSchemaChanges: hasSchemaChanges })
  );

  const showManagementBar =
    (hasChanges || hasSchemaChanges) && !interactiveModeWithStepUnderEdit && !isSuggestionVisible;

  const onBottomBarViewCodeClick = async () => {
    const { context: enrichmentContext } = getStreamEnrichmentState();
    const request = await processingPersistenceAdapter.getProcessingRequestPreview({
      definition: enrichmentContext.definition,
      pipeline: enrichmentContext.pipeline,
      pipelineDefinition: nextPipelineDefinition,
    });

    openRequestPreviewFlyout({
      method: request.method,
      url: request.url,
      body: request.body,
    });
  };

  const openConfirmationModal = () => {
    if (!hasSchemaChanges) {
      void saveChanges({ saveSchemaChanges: false });
      return;
    }

    const overlay = core.overlays.openModal(
      toMountPoint(
        <StreamsAppContextProvider context={context}>
          <SchemaChangesReviewModal
            fields={schemaEditorFields}
            streamType={getStreamTypeFromDefinition(definition.stream)}
            definition={definition}
            storedFields={definitionFields}
            submitChanges={async () => saveChanges({ saveSchemaChanges: true })}
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

  if (!isReady || !showManagementBar) {
    return null;
  }

  return (
    <>
      <EuiFlyoutFooter>
        <div
          css={css`
            width: 100%;
            padding: ${euiTheme.size.m} ${euiTheme.size.l};
            box-sizing: border-box;
          `}
        >
          <EuiFlexGroup
            justifyContent="spaceBetween"
            alignItems="center"
            responsive={false}
            gutterSize="s"
          >
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="streamsAppManagementBottomBarViewRequestButton"
                data-stream-type={streamType}
                color="text"
                size="s"
                iconType="code"
                onClick={onBottomBarViewCodeClick}
                disabled={hasDefinitionError || hasAnyErrors}
              >
                {viewCodeButtonText}
              </EuiButtonEmpty>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiFlexGroup
                justifyContent="center"
                alignItems="center"
                responsive={false}
                gutterSize="s"
              >
                <EuiButtonEmpty
                  data-test-subj="streamsAppManagementBottomBarCancelChangesButton"
                  data-stream-type={streamType}
                  disabled={!canUpdate || isSimulating || interactiveModeWithStepUnderEdit}
                  color="text"
                  size="s"
                  iconType="cross"
                  onClick={handleCancel}
                >
                  {i18n.translate('xpack.streams.streamDetailView.managementTab.bottomBar.cancel', {
                    defaultMessage: 'Cancel changes',
                  })}
                </EuiButtonEmpty>
                <EuiToolTip
                  content={
                    hasDefinitionError || hasAnyErrors
                      ? i18n.translate(
                          'xpack.streams.streamDetailView.managementTab.bottomBar.fixErrors',
                          {
                            defaultMessage: 'Please fix the errors before saving.',
                          }
                        )
                      : !canManage
                      ? i18n.translate(
                          'xpack.streams.streamDetailView.managementTab.bottomBar.onlySimulate',
                          {
                            defaultMessage: "You don't have sufficient privileges to save changes.",
                          }
                        )
                      : undefined
                  }
                >
                  <EuiButton
                    data-test-subj="streamsAppManagementBottomBarButton"
                    data-stream-type={streamType}
                    disabled={
                      !canUpdate ||
                      isSimulating ||
                      interactiveModeWithStepUnderEdit ||
                      !canManage ||
                      hasDefinitionError ||
                      hasAnyErrors
                    }
                    color="primary"
                    fill
                    size="s"
                    iconType="check"
                    onClick={
                      schemaEditorFields.length > 0 && hasSchemaChanges
                        ? openConfirmationModal
                        : () => saveChanges({ saveSchemaChanges: false })
                    }
                    isLoading={isSavingChanges}
                  >
                    {defaultConfirmButtonText}
                  </EuiButton>
                </EuiToolTip>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </EuiFlyoutFooter>
      {isRequestPreviewFlyoutOpen && (
        <RequestPreviewFlyout
          codeContent={requestPreviewFlyoutCodeContent}
          onClose={closeRequestPreviewFlyout}
        />
      )}
    </>
  );
}

const verticalFlexCss = css`
  display: flex;
  flex-direction: column;
`;

const fullHeightCss = css`
  height: 100%;
  min-height: 0;
`;

const defaultConfirmButtonText = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.bottomBar.confirm',
  { defaultMessage: 'Save changes' }
);

const viewCodeButtonText = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.bottomBar.viewCode',
  { defaultMessage: 'View API request' }
);

const discardUnsavedChangesLabel = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.pipelineProcessing.discardUnsavedChangesLabel',
  { defaultMessage: 'Discard unsaved changes' }
);

const keepEditingLabel = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.pipelineProcessing.discardUnsavedChangesKeepEditing',
  { defaultMessage: 'Keep editing' }
);

const discardUnsavedChangesTitle = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.pipelineProcessing.discardUnsavedChangesTitle',
  { defaultMessage: 'Discard unsaved changes?' }
);

const discardUnsavedChangesMessage = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.pipelineProcessing.discardUnsavedChangesMessage',
  { defaultMessage: 'Changes that you have made will be discarded.' }
);

const DRAFT_SIMULATION_INFO_LABEL = i18n.translate(
  'xpack.streams.enrichment.draftSimulationInfo.ariaLabel',
  { defaultMessage: 'Draft simulation info' }
);

const DraftSimulationInfoPopover = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <EuiPopover
      button={
        <EuiToolTip content={DRAFT_SIMULATION_INFO_LABEL} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="info"
            color="text"
            size="xs"
            aria-label={DRAFT_SIMULATION_INFO_LABEL}
            onClick={() => setIsOpen((prev) => !prev)}
            data-test-subj="streamsAppProcessingDraftSimulationInfoButton"
          />
        </EuiToolTip>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
      panelPaddingSize="s"
      panelStyle={{ maxWidth: 320 }}
      aria-label={DRAFT_SIMULATION_INFO_LABEL}
    >
      <EuiText size="s">
        <FormattedMessage
          id="xpack.streams.enrichment.draftSimulationPopover.content"
          defaultMessage="Draft stream simulation combines read-time ES|QL with ingest pipeline simulation. Results may differ slightly from materialized streams. {learnMore}"
          values={{
            learnMore: (
              <EuiLink
                href="https://www.elastic.co/docs/solutions/observability/streams/management/extract#streams-processor-inconsistencies"
                target="_blank"
                external
              >
                <FormattedMessage
                  id="xpack.streams.enrichment.draftSimulationPopover.learnMore"
                  defaultMessage="Learn more"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiText>
    </EuiPopover>
  );
};
