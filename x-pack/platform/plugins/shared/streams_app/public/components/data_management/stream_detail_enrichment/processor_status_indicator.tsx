/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAvatar,
  EuiAvatarProps,
  EuiLoadingSpinner,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { useSelector } from '@xstate5/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ProcessorConfigurationProps } from './processors';
import {
  useSimulatorSelector,
  useStreamEnrichmentSelector,
} from './state_management/stream_enrichment_state_machine';

export const ProcessorStatusIndicator = ({
  processorRef,
}: {
  processorRef: ProcessorConfigurationProps['processorRef'];
}) => {
  const { euiTheme } = useEuiTheme();
  const isNew = useSelector(processorRef, (snapshot) => snapshot.context.isNew);
  const hasSimulation = useSimulatorSelector((snapshot) => Boolean(snapshot.context.simulation));
  const isParticipatingInSimulation = useSimulatorSelector((snapshot) =>
    snapshot.context.processors.find((p) => p.id === processorRef.id)
  );
  const isSimulationRunning = useSimulatorSelector((snapshot) =>
    snapshot.matches('runningSimulation')
  );

  const isPending = useSimulatorSelector(
    (snapshot) =>
      snapshot.context.simulation &&
      !snapshot.context.simulation.processors_metrics[processorRef.id]
  );
  const isFailing = useSimulatorSelector((snapshot) =>
    Boolean(
      snapshot.context.simulation?.processors_metrics[processorRef.id]?.errors.some(
        (e) => e.type === 'generic_simulation_failure'
      )
    )
  );
  const isAnyProcessorBeforePersisted = useStreamEnrichmentSelector((state) => {
    // Check if any new processoris positioned before persisted processors
    return state.context.processorsRefs
      .map((ref) => ref.getSnapshot())
      .some((snapshot, id, processorSnapshots) => {
        // Skip if this processor is already persisted
        if (!snapshot.context.isNew) return false;

        // Check if there are persisted processors after this position
        const hasPersistedAfter = processorSnapshots
          .slice(id + 1)
          .some(({ context }) => !context.isNew);

        return hasPersistedAfter;
      });
  });

  let variant:
    | (EuiAvatarProps & {
        tooltipContent?: string;
      })
    | null = null;

  if (isAnyProcessorBeforePersisted) {
    const name = i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.mixedProcessorTooltip',
      {
        defaultMessage:
          'Currently, is not possible to simulate persisted and new processors together. Move the new processors after the persisted processors to restore the simulation behavior.',
      }
    );
    variant = {
      name,
      iconType: 'dot',
      color: euiTheme.colors.backgroundBaseDisabled,
      tooltipContent: name,
    };
  } else if (!isParticipatingInSimulation) {
    const name = isNew
      ? i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.skippedNewProcessorTooltip',
          {
            defaultMessage:
              'This processor is skipped since it comes after the processor under edit.',
          }
        )
      : i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.skippedConfiguredProcessorTooltip',
          {
            defaultMessage: 'This processor is skipped since it is persisted already.',
          }
        );

    variant = {
      name,
      iconType: 'dot',
      color: euiTheme.colors.backgroundBaseDisabled,
      tooltipContent: name,
    };
  } else {
    if (isSimulationRunning) {
      const name = i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.simulatingProcessorTooltip',
        { defaultMessage: 'Simulating processor' }
      );
      variant = {
        name,
        iconType: () => <EuiLoadingSpinner />,
        color: euiTheme.colors.backgroundBasePrimary,
      };
    } else if (!hasSimulation || isPending) {
      const name = i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.pendingProcessorTooltip',
        { defaultMessage: 'Pending to run for simulation.' }
      );
      variant = {
        name,
        iconType: 'clock',
        color: euiTheme.colors.backgroundBaseDisabled,
        tooltipContent: name,
      };
    } else if (isFailing) {
      const name = i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.failingProcessorTooltip',
        {
          defaultMessage: 'This processor configuration has failed the simulation.',
        }
      );
      variant = {
        name,
        iconType: 'cross',
        color: euiTheme.colors.backgroundBaseDanger,
        tooltipContent: name,
      };
    } else {
      const name = i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.newProcessorTooltip',
        {
          defaultMessage:
            'This processor configuration has successfully gone throught the simulation.',
        }
      );
      variant = {
        name,
        iconType: 'check',
        color: euiTheme.colors.backgroundBaseSuccess,
        tooltipContent: name,
      };
    }
  }

  if (!variant) {
    return null;
  }

  const { tooltipContent, ...avatarProps } = variant;

  return (
    <EuiToolTip content={tooltipContent}>
      <EuiAvatar size="m" {...avatarProps} />
    </EuiToolTip>
  );
};
