/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { StreamlangYamlEditor } from '@kbn/streamlang-yaml-editor';
import type { StreamlangDSL } from '@kbn/streamlang/types/streamlang';
import { validationErrorTypeLabels } from '@kbn/streamlang';
import {
  EuiAccordion,
  EuiCallOut,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { isEmpty } from 'lodash';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  useStreamEnrichmentSelector,
  useStreamEnrichmentEvents,
  useYamlModeSelector,
  useSimulatorSelector,
} from '../state_management/stream_enrichment_state_machine';
import {
  selectValidationErrors,
  selectSchemaErrors,
} from '../state_management/stream_enrichment_state_machine/selectors';
import { useYamlStepsProcessingSummary } from '../state_management/use_yaml_steps_processing_summary';
import { useSimulationErrors } from '../state_management/use_simulation_errors';
import { SimulationErrorsList } from '../simulation_errors';
import { getStreamTypeFromDefinition } from '../../../../util/get_stream_type_from_definition';

export const YamlEditorWrapper = () => {
  const dsl = useStreamEnrichmentSelector((state) => state.context.nextStreamlangDSL);
  const definition = useStreamEnrichmentSelector((state) => state.context.definition);
  const streamType = getStreamTypeFromDefinition(definition.stream);
  const editorStreamType =
    streamType === 'unknown' || streamType === 'query' ? undefined : streamType;
  const simulation = useSimulatorSelector((snapshot) => snapshot.context.simulation);
  const canSimulate = useStreamEnrichmentSelector(
    (state) => state.context.definition.privileges.simulate
  );
  const simulationMode = useYamlModeSelector((state) => state.context.simulationMode);

  const previousStreamlangDSL = useStreamEnrichmentSelector(
    (state) => state.context.previousStreamlangDSL
  );
  const { sendYAMLUpdates, runSimulation } = useStreamEnrichmentEvents();

  const canRunSimulation = useYamlModeSelector((state) => {
    return state.can({ type: 'yaml.runSimulation' });
  });

  const additiveStepIds = useYamlModeSelector((state) => {
    return state.context.additiveChanges.newStepIds ?? [];
  });

  const stepSummary = useYamlStepsProcessingSummary();
  const processorsMetrics = simulation?.processors_metrics;
  const hasSimulationResult = Boolean(simulation);

  const { errors: simulationErrors } = useSimulationErrors();
  const additiveChanges = useYamlModeSelector((state) => state.context.additiveChanges);

  // Get schema errors from parent enrichment machine (Zod parsing errors)
  const schemaErrors = useStreamEnrichmentSelector((state) => selectSchemaErrors(state.context));
  const hasSchemaErrors = schemaErrors.length > 0;

  // Get validation errors for gutter markers and accordion
  const validationErrors = useStreamEnrichmentSelector((state) =>
    selectValidationErrors(state.context)
  );
  const allValidationErrors = useMemo(() => {
    return Array.from(validationErrors.values()).flat();
  }, [validationErrors]);
  const hasValidationErrors = allValidationErrors.length > 0;

  // Handle DSL changes from the editor (already debounced and parsed)
  const handleDslChange = useCallback(
    (newDsl: StreamlangDSL, yamlString: string) => {
      sendYAMLUpdates(newDsl, yamlString);
    },
    [sendYAMLUpdates]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="m" css={fullHeightContainer}>
      <EuiFlexItem grow={true} css={editorContainer}>
        {/* NOTE: Incredibly insidious but this must be hasShadow={false} or the transforms
        applied for shadows will break Monaco's fixed positioning for menus */}
        <EuiPanel css={fullHeightPanel} paddingSize="none" hasShadow={false}>
          <StreamlangYamlEditor
            dsl={dsl}
            onDslChange={handleDslChange}
            height="100%"
            data-test-subj="streamsAppEnrichmentYamlEditor"
            stepSummary={stepSummary}
            processorsMetrics={processorsMetrics}
            hasSimulationResult={hasSimulationResult}
            // If the previous DSL reference changes we know a reset / reinitialization has occurred.
            reinitializationDeps={[previousStreamlangDSL]}
            readOnly={!canSimulate}
            onRunUpToStep={runSimulation}
            canRunSimulation={canRunSimulation}
            additiveStepIds={additiveStepIds}
            simulationMode={simulationMode}
            streamType={editorStreamType}
            validationErrors={validationErrors}
          />
        </EuiPanel>
      </EuiFlexItem>

      {simulationMode === 'partial' && !additiveChanges.isPurelyAdditive && (
        <EuiFlexItem grow={false}>
          <EuiCallOut
            announceOnMount
            title={i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.yamlMode.nonAdditiveWarning.title',
              {
                defaultMessage: 'Simulation disabled',
              }
            )}
            color="warning"
            iconType="alert"
            size="s"
          >
            <p>
              {i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.yamlMode.nonAdditiveWarning.description',
                {
                  defaultMessage:
                    'The simulation is disabled as changes are no longer purely additive (new steps only).',
                }
              )}
            </p>
          </EuiCallOut>
        </EuiFlexItem>
      )}

      {(!isEmpty(simulationErrors.ignoredFields) ||
        !isEmpty(simulationErrors.mappingFailures) ||
        simulationErrors.definition_error) && (
        <EuiFlexItem grow={false}>
          <SimulationErrorsList errors={simulationErrors} />
        </EuiFlexItem>
      )}

      {hasSchemaErrors && (
        <EuiFlexItem grow={false}>
          <DSLErrorsList errors={schemaErrors} />
        </EuiFlexItem>
      )}

      {hasValidationErrors && (
        <EuiFlexItem grow={false}>
          <EuiPanel paddingSize="s" hasShadow={false} grow={false} color="danger">
            <EuiAccordion
              id="validation-errors-accordion"
              initialIsOpen
              buttonContent={
                <strong>
                  {i18n.translate(
                    'xpack.streams.streamDetailView.managementTab.enrichment.validationErrors.count',
                    {
                      defaultMessage:
                        '{count, plural, one {# validation error} other {# validation errors}}',
                      values: { count: allValidationErrors.length },
                    }
                  )}
                </strong>
              }
            >
              <EuiText size="s">
                <ul>
                  {allValidationErrors.map((error, idx) => {
                    const errorTypeLabel = validationErrorTypeLabels[error.type];
                    return (
                      <li key={idx}>
                        <strong>{errorTypeLabel}:</strong> {error.message}
                      </li>
                    );
                  })}
                </ul>
              </EuiText>
            </EuiAccordion>
          </EuiPanel>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const DSLErrorsList: React.FC<{ errors: string[] }> = ({ errors }) => {
  return (
    <EuiPanel paddingSize="s" hasShadow={false} grow={false} color="danger">
      <EuiAccordion
        id="dsl-errors-accordion"
        initialIsOpen={false}
        buttonContent={
          <strong>
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.yamlErrors.title',
              { defaultMessage: 'Malformed Streamlang detected.' }
            )}
          </strong>
        }
      >
        <EuiText component="p" size="s">
          <p>
            <FormattedMessage
              id="xpack.streams.streamDetailView.managementTab.enrichment.yamlErrors.errors"
              defaultMessage="Streamlang DSL is invalid: {errors}"
              values={{
                errors: errors.map((error) => (
                  <>
                    <EuiCode key={error}>{error}</EuiCode>{' '}
                  </>
                )),
              }}
            />
          </p>
        </EuiText>
      </EuiAccordion>
    </EuiPanel>
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
