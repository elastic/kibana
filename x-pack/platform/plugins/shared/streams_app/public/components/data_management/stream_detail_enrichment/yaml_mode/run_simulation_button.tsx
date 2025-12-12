/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  useStreamEnrichmentEvents,
  useYamlModeSelector,
} from '../state_management/stream_enrichment_state_machine';
import { useSimulatorSelector } from '../state_management/stream_enrichment_state_machine/use_stream_enrichment';

export const RunSimulationButton = () => {
  const canRunSimulation = useYamlModeSelector((state) => {
    return state.can({ type: 'yaml.runSimulation' });
  });

  const isSimulationRunning = useSimulatorSelector((snapshot) =>
    snapshot.matches('runningSimulation')
  );

  const { runSimulation } = useStreamEnrichmentEvents();

  return (
    <EuiToolTip
      content={
        !canRunSimulation
          ? i18n.translate(
              'xpack.streams.enrichment.yamlMode.runSimulationButton.disabledTooltip',
              {
                defaultMessage:
                  'Simulation cannot be run. Ensure the YAML is valid, sufficient privileges are granted, and any changes are purely additive for partial data sources.',
              }
            )
          : undefined
      }
    >
      <span style={{ display: 'inline-flex' }}>
        <EuiButtonIcon
          iconType="playFilled"
          aria-label={i18n.translate(
            'xpack.streams.enrichment.yamlMode.runSimulationButton.ariaLabel',
            {
              defaultMessage: 'Run simulation',
            }
          )}
          onClick={() => runSimulation()}
          isDisabled={!canRunSimulation}
          display="base"
          size="s"
          isLoading={isSimulationRunning}
          data-test-subj="streamsAppEnrichmentRunSimulationButton"
        />
      </span>
    </EuiToolTip>
  );
};
