/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiIconTipProps } from '@elastic/eui';
import { EuiIconTip, EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import { useSelector } from '@xstate5/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  useSimulatorSelector,
  useStreamEnrichmentSelector,
} from '../../../state_management/stream_enrichment_state_machine';
import { selectWhetherAnyProcessorBeforePersisted } from '../../../state_management/stream_enrichment_state_machine/selectors';
import type { ActionBlockProps } from '.';

export const ProcessorStatusIndicator = ({ stepRef }: { stepRef: ActionBlockProps['stepRef'] }) => {
  const { euiTheme } = useEuiTheme();

  const isNew = useSelector(stepRef, (snapshot) => snapshot.context.isNew);

  const hasSimulation = useSimulatorSelector((snapshot) => Boolean(snapshot.context.simulation));
  const isParticipatingInSimulation = useSimulatorSelector((snapshot) =>
    snapshot.context.steps.find((p) => p.customIdentifier === stepRef.id)
  );
  const isSimulationRunning = useSimulatorSelector((snapshot) =>
    snapshot.matches('runningSimulation')
  );
  const isPending = useSimulatorSelector(
    (snapshot) =>
      snapshot.context.simulation && !snapshot.context.simulation.processors_metrics[stepRef.id]
  );
  const isFailing = useSimulatorSelector((snapshot) =>
    Boolean(
      snapshot.context.simulation?.processors_metrics[stepRef.id]?.errors.some(
        (e) => e.type === 'generic_simulation_failure'
      )
    )
  );
  const isAnyProcessorBeforePersisted = useStreamEnrichmentSelector((snapshot) =>
    selectWhetherAnyProcessorBeforePersisted(snapshot.context)
  );

  let variant: EuiIconTipProps | null = null;

  if (isAnyProcessorBeforePersisted) {
    const name = i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.mixedProcessorTooltip',
      {
        defaultMessage:
          'Simulation is disabled when new processors are placed between previously made processors. To enable simulation, move all new processors to the end.',
      }
    );
    variant = {
      type: 'dot',
      color: 'subdued',
      content: name,
      size: 'm',
    };
  } else if (!isParticipatingInSimulation) {
    const name = isNew
      ? i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.skippedNewProcessorTooltip',
          {
            defaultMessage: 'Processor skipped because it follows a processor being edited.',
          }
        )
      : i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.skippedConfiguredProcessorTooltip',
          {
            defaultMessage:
              'Processor skipped because it was created in a previous simulation session.',
          }
        );

    variant = {
      type: 'dot',
      color: 'warning',
      content: name,
      size: 'm',
    };
  } else {
    if (isSimulationRunning) {
      const name = i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.simulatingProcessorTooltip',
        { defaultMessage: 'Simulating processor' }
      );
      variant = {
        content: name,
        type: () => <EuiLoadingSpinner />,
        color: euiTheme.colors.backgroundBasePrimary,
        size: 's',
      };
    } else if (!hasSimulation || isPending) {
      const name = i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.pendingProcessorTooltip',
        { defaultMessage: 'Pending to run for simulation.' }
      );
      variant = {
        type: 'dot',
        color: 'danger',
        content: name,
        size: 'm',
      };
    } else if (isFailing) {
      const name = i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.failingProcessorTooltip',
        {
          defaultMessage: 'Processor configuration failed simulation.',
        }
      );
      variant = {
        type: 'crossInCircle',
        color: 'danger',
        content: name,
        size: 's',
      };
    } else {
      const name = i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.newProcessorTooltip',
        {
          defaultMessage: 'Processor configuration simulated successfully.',
        }
      );
      variant = {
        type: 'checkInCircleFilled',
        color: 'success',
        content: name,
        size: 's',
      };
    }
  }

  if (!variant) {
    return null;
  }

  return <EuiIconTip {...variant} />;
};
