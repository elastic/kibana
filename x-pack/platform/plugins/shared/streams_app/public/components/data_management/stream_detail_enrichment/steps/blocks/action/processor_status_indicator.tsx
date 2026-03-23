/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiIconTipProps } from '@elastic/eui';
import { EuiIconTip, EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { ActionBlockProps } from '.';

export const ProcessorStatusIndicator = ({
  stepRef,
  stepsProcessingSummaryMap,
}: {
  stepRef: ActionBlockProps['stepRef'];
  stepsProcessingSummaryMap: ActionBlockProps['stepsProcessingSummaryMap'];
}) => {
  const { euiTheme } = useEuiTheme();

  if (!stepsProcessingSummaryMap) return null;

  const stepId = stepRef.id;

  const stepStatus = stepsProcessingSummaryMap.get(stepId);

  let variant: EuiIconTipProps | null = null;

  if (stepStatus === 'disabled.processorBeforePersisted') {
    const name = i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.mixedProcessorTooltip',
      {
        defaultMessage:
          'Simulation is disabled when new processors are placed between previously made processors. To enable simulation, move all new processors to the end.',
      }
    );
    variant = {
      type: 'minusInCircle',
      color: euiTheme.colors.textDisabled,
      content: name,
      size: 'm',
    };
  } else if (
    stepStatus === 'skipped.followsProcessorBeingEdited' ||
    stepStatus === 'skipped.createdInPreviousSimulation' ||
    stepStatus === 'skipped.excludedByFilteringCondition'
  ) {
    let name: string;

    switch (stepStatus) {
      case 'skipped.excludedByFilteringCondition':
        name = i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.skippedProcessorFilteringConditionTooltip',
          {
            defaultMessage:
              'Processor skipped because it is excluded by the currently selected condition.',
          }
        );
        break;
      case 'skipped.followsProcessorBeingEdited':
        name = i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.skippedNewProcessorTooltip',
          {
            defaultMessage: 'Processor skipped because it follows a processor being edited.',
          }
        );
        break;
      case 'skipped.createdInPreviousSimulation':
      default:
        name = i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.skippedConfiguredProcessorTooltip',
          {
            defaultMessage:
              'Processor skipped because it was created in a previous simulation session.',
          }
        );
        break;
    }

    variant = {
      type: 'dashedCircle',
      color: euiTheme.colors.textParagraph,
      content: name,
      size: 'm',
    };
  } else {
    if (stepStatus === 'running') {
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
    } else if (stepStatus === 'pending') {
      const name = i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.pendingProcessorTooltip',
        { defaultMessage: 'Pending simulation.' }
      );
      variant = {
        type: 'dot',
        color: 'danger',
        content: name,
        size: 'l',
      };
    } else if (stepStatus === 'failed') {
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
        size: 'm',
      };
    } else if (stepStatus === 'successful') {
      const name = i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.newProcessorTooltip',
        {
          defaultMessage: 'Processor configuration simulated successfully.',
        }
      );
      variant = {
        type: 'checkCircle',
        color: 'success',
        content: name,
        size: 'm',
      };
    }
  }

  if (!variant) {
    return null;
  }

  return <EuiIconTip {...variant} />;
};
