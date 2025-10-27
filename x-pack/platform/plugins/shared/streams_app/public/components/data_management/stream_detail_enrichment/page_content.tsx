/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiResizableContainer, EuiSplitPanel } from '@elastic/eui';
import type { Streams } from '@kbn/streams-schema';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { css } from '@emotion/react';
import { toMountPoint } from '@kbn/react-kibana-mount';
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
import { selectIsInteractiveMode } from './state_management/stream_enrichment_state_machine/selectors';
import { StreamsAppContextProvider } from '../../streams_app_context_provider';
import { getStreamTypeFromDefinition } from '../../../util/get_stream_type_from_definition';
import { SchemaChangesReviewModal, getChanges } from '../schema_editor/schema_changes_review_modal';
import { getDefinitionFields } from '../schema_editor/hooks/use_schema_fields';
import { EditModeToggle } from './edit_mode_toggle';
import { RunSimulationButton } from './yaml_mode/run_simulation_button';
import { YamlEditorWrapper } from './yaml_mode/yaml_editor_wrapper';
import { StepsEditor } from './steps/steps_editor';
import { stepUnderEditSelector } from './state_management/interactive_mode_machine/selectors';

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
  const isInteractiveMode = useStreamEnrichmentSelector(selectIsInteractiveMode);
  const isYamlMode = !isInteractiveMode;
  // Bit clunky but it's just because at this top level we have concerns of both modes crossing over.
  const interactiveModeWithStepUnderEdit = useStreamEnrichmentSelector((state) => {
    const interactiveModeContext = state.context.interactiveModeRef?.getSnapshot().context;
    return interactiveModeContext && Boolean(stepUnderEditSelector(interactiveModeContext));
  });
  const { appParams, core } = context;

  const { resetChanges, saveChanges } = useStreamEnrichmentEvents();

  const isReady = useStreamEnrichmentSelector((state) => state.matches('ready'));
  const isSimulating = useSimulatorSelector((state) => state.matches('runningSimulation'));
  const definition = useStreamEnrichmentSelector((state) => state.context.definition);
  const canUpdate = useStreamEnrichmentSelector((state) => state.can({ type: 'stream.update' }));
  const detectedFields = useSimulatorSelector((state) => state.context.detectedSchemaFields);
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

  const isInvalid = useStreamEnrichmentSelector(
    (state) => state.context.isNextStreamlangDSLValid === false
  );

  const hasChanges = useStreamEnrichmentSelector((state) => state.context.hasChanges);

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
                <EuiFlexGroup direction="column" gutterSize="m" style={{ height: '100%' }}>
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
                      <EuiFlexItem grow />
                      {isYamlMode && (
                        <EuiFlexItem grow={false}>
                          <RunSimulationButton />
                        </EuiFlexItem>
                      )}
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem grow style={{ minHeight: 0, overflow: 'auto' }}>
                    {isYamlMode ? <YamlEditorWrapper /> : <StepsEditor />}
                  </EuiFlexItem>
                </EuiFlexGroup>
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
      {hasChanges && !isSimulating && !interactiveModeWithStepUnderEdit && (
        <ManagementBottomBar
          onCancel={resetChanges}
          onConfirm={
            detectedFields.length > 0 && getChanges(detectedFields, definitionFields).length > 0
              ? openConfirmationModal
              : saveChanges
          }
          isLoading={isSavingChanges}
          disabled={!canUpdate}
          insufficientPrivileges={!canManage}
          isInvalid={hasDefinitionError || isInvalid}
        />
      )}
    </EuiSplitPanel.Outer>
  );
}

const verticalFlexCss = css`
  display: flex;
  flex-direction: column;
`;
