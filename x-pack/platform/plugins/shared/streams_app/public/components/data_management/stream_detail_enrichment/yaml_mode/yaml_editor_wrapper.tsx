/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { StreamlangYamlEditor } from '@kbn/streamlang-yaml-editor';
import yaml from 'yaml';
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
import { useYamlStepsProcessingSummary } from '../state_management/use_yaml_steps_processing_summary';
import { useSimulationErrors } from '../state_management/use_simulation_errors';
import { SimulationErrorsList } from '../simulation_errors';

export const YamlEditorWrapper = () => {
  const dsl = useStreamEnrichmentSelector((state) => state.context.nextStreamlangDSL);
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
  const dslErrors = useYamlModeSelector((state) => state.context.errors);
  const additiveChanges = useYamlModeSelector((state) => state.context.additiveChanges);

  // Track the current YAML value for debouncing
  const [yamlValue, setYamlValue] = useState<string>('');

  // Debounce sending updates to the state machine
  useDebounce(
    () => {
      if (yamlValue) {
        try {
          // Provided the YAML is parseable we'll update the state machine.
          // The machine will handle actual Streamlang validity.
          const nextDsl = yaml.parse(yamlValue);
          sendYAMLUpdates(nextDsl, yamlValue);
          // eslint-disable-next-line no-empty
        } catch (e) {}
      }
    },
    300,
    [yamlValue]
  );

  const handleChange = (newValue: string) => {
    setYamlValue(newValue);
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="m" css={fullHeightContainer}>
      <EuiFlexItem grow={true} css={editorContainer}>
        <EuiPanel css={fullHeightPanel} paddingSize="none">
          <StreamlangYamlEditor
            dsl={dsl}
            onChange={handleChange}
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

      {!isEmpty(dslErrors) && (
        <EuiFlexItem grow={false}>
          <DSLErrorsList errors={dslErrors} />
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
              defaultMessage="The Streamlang DSL is invalid due to the following: {errors}"
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
