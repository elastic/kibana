/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { css } from '@emotion/react';
import { IngestPipelineJsonEditor } from '@kbn/ingest-pipeline-json-editor';
import type { IngestPipelineProcessor } from '@kbn/ingest-pipeline-json-editor';
import {
  useSimulatorSelector,
  useStreamEnrichmentEvents,
  useStreamEnrichmentSelector,
  useJsonModeSelector,
} from '../state_management/stream_enrichment_state_machine';
import { selectValidationErrors } from '../state_management/stream_enrichment_state_machine/selectors';
import { useJsonStepsProcessingSummary } from '../state_management/use_json_steps_processing_summary';
import { processorsToUiDefinition, uiDefinitionToProcessors } from '../ingest_pipeline_processors';
import { ErrorPanel } from '../steps/steps_editor';

export const JsonEditorWrapper = () => {
  const nextPipelineDefinition = useStreamEnrichmentSelector(
    (state) => state.context.nextPipelineDefinition
  );
  const previousPipelineDefinition = useStreamEnrichmentSelector(
    (state) => state.context.previousPipelineDefinition
  );
  const validationErrors = useStreamEnrichmentSelector((state) =>
    selectValidationErrors(state.context)
  );
  const stepSummary = useJsonStepsProcessingSummary();
  const simulationResult = useSimulatorSelector((snapshot) => snapshot.context.simulation);
  const processorsMetrics = useSimulatorSelector(
    (snapshot) => snapshot.context.simulation?.processors_metrics
  );
  const hasSimulationResult = useSimulatorSelector((snapshot) =>
    Boolean(snapshot.context.simulation)
  );
  const canRunSimulation = useJsonModeSelector((state) =>
    state.can({ type: 'json.runSimulation' })
  );
  const simulationMode = useJsonModeSelector((state) => state.context.simulationMode);
  const { sendJSONUpdates, runSimulation, setSchemaErrors } = useStreamEnrichmentEvents();

  const processors = useMemo(
    () => uiDefinitionToProcessors(nextPipelineDefinition),
    [nextPipelineDefinition]
  );

  const additiveStepIds = useMemo(() => {
    const persistedIds = new Set(
      previousPipelineDefinition.steps.map((step) => step.customIdentifier).filter(Boolean)
    );
    return nextPipelineDefinition.steps
      .map((step) => step.customIdentifier)
      .filter((stepId): stepId is string => Boolean(stepId) && !persistedIds.has(stepId));
  }, [nextPipelineDefinition.steps, previousPipelineDefinition.steps]);

  return (
    <EuiFlexGroup direction="column" gutterSize="m" responsive={false} css={fullHeightContainer}>
      <EuiFlexItem grow css={editorContainer}>
        {/* Monaco overlay widgets break if an ancestor panel applies shadow transforms. */}
        <EuiPanel css={fullHeightPanel} paddingSize="none" hasShadow={false}>
          <IngestPipelineJsonEditor
            processors={processors}
            onProcessorsChange={(updatedProcessors: IngestPipelineProcessor[], json: string) => {
              sendJSONUpdates(processorsToUiDefinition(updatedProcessors), json);
            }}
            onSchemaErrorsChange={setSchemaErrors}
            stepSummary={stepSummary}
            simulationResult={simulationResult}
            processorsMetrics={processorsMetrics}
            hasSimulationResult={hasSimulationResult}
            onRunUpToStep={runSimulation}
            canRunSimulation={canRunSimulation}
            additiveStepIds={additiveStepIds}
            simulationMode={simulationMode}
            validationErrors={validationErrors}
            reinitializationDeps={[previousPipelineDefinition]}
            data-test-subj="streamsAppIngestPipelineJsonEditor"
          />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ErrorPanel />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const fullHeightContainer = css`
  height: 100%;
  overflow: hidden;
`;

const editorContainer = css`
  min-height: 0;
  overflow: hidden;
`;

const fullHeightPanel = css`
  height: 100%;
  display: flex;
  flex-direction: column;
`;
