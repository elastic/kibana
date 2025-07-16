/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAvatar,
  EuiDraggable,
  EuiLoadingSpinner,
  EuiTimelineItem,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useSelector } from '@xstate5/react';
import { ProcessorConfiguration, ProcessorConfigurationProps } from './processors';
import { useSimulatorSelector } from './state_management/stream_enrichment_state_machine';

export const DraggableProcessorListItem = ({
  idx,
  isDragDisabled,
  ...props
}: Omit<ProcessorConfigurationProps, 'dragHandleProps'> & {
  idx: number;
  isDragDisabled: boolean;
}) => {
  return (
    <EuiTimelineItem
      verticalAlign="top"
      icon={<ProcessorStatusIndicator processorRef={props.processorRef} />}
      css={css`
        [class*='euiTimelineItemEvent'] {
          min-width: 0;
        }
        [class*='euiTimelineItemIcon-top'] {
          translate: 0 9px; // (50px - 32px) / 2 => Height of the block minus the avatar size to center the item
        }
      `}
    >
      <EuiDraggable
        index={idx}
        spacing="none"
        draggableId={props.processorRef.id}
        hasInteractiveChildren
        customDragHandle
        isDragDisabled={isDragDisabled}
      >
        {(provided) => (
          <ProcessorConfiguration
            {...props}
            dragHandleProps={isDragDisabled ? null : provided.dragHandleProps}
          />
        )}
      </EuiDraggable>
    </EuiTimelineItem>
  );
};

const ProcessorStatusIndicator = ({
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
    Boolean(snapshot.context.simulation?.processors_metrics[processorRef.id]?.failed_rate === 1)
  );

  let variant = {};

  if (isParticipatingInSimulation) {
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
  } else {
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
  }

  const { tooltipContent, ...avatarProps } = variant;

  return (
    <EuiToolTip content={tooltipContent}>
      <EuiAvatar size="m" {...avatarProps} />
    </EuiToolTip>
  );
};
