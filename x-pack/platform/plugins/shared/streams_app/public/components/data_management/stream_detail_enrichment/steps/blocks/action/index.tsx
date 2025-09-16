/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from '@xstate5/react';
import React, { useEffect, useRef } from 'react';
import { EuiPanel, useEuiTheme } from '@elastic/eui';
import { useFirstMountState } from 'react-use/lib/useFirstMountState';
import { css } from '@emotion/react';
import { useSimulatorSelector } from '../../../state_management/stream_enrichment_state_machine';
import { isRootStep, isStepUnderEdit } from '../../../state_management/steps_state_machine';
import type { StepConfigurationProps } from '../../steps_list';
import type { ProcessorMetrics } from '../../../state_management/simulation_state_machine';
import { ActionBlockEditor } from './editor';
import { ActionBlockListItem } from './list_item';
import { getStepPanelColour } from '../../../utils';

export type ActionBlockProps = StepConfigurationProps & {
  processorMetrics?: ProcessorMetrics;
};
export function ActionBlock({
  stepRef,
  level,
  stepUnderEdit,
  rootLevelMap,
  stepsProcessingSummaryMap,
}: StepConfigurationProps) {
  const { euiTheme } = useEuiTheme();
  const isUnderEdit = useSelector(stepRef, (snapshot) => isStepUnderEdit(snapshot));
  const isRootStepValue = useSelector(stepRef, (snapshot) => isRootStep(snapshot));

  const simulation = useSimulatorSelector((snapshot) => snapshot.context.simulation);

  const panelColour = getStepPanelColour(level);

  const processorMetrics = simulation?.processors_metrics[stepRef.id];

  const isFirstMount = useFirstMountState();
  const freshBlockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isFirstMount && isUnderEdit && freshBlockRef.current) {
      freshBlockRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });
    }
  }, [isFirstMount, isUnderEdit]);

  return (
    <EuiPanel
      data-test-subj="streamsAppProcessorBlock"
      paddingSize="m"
      hasShadow={false}
      color={isUnderEdit && isRootStepValue ? undefined : panelColour}
      css={
        isUnderEdit
          ? css`
              border: 1px solid ${euiTheme.colors.borderStrongPrimary};
              box-sizing: border-box;
            `
          : css`
              border: ${euiTheme.border.thin};
            `
      }
    >
      {isUnderEdit ? (
        <ActionBlockEditor
          processorMetrics={processorMetrics}
          stepRef={stepRef}
          level={level}
          ref={freshBlockRef}
          rootLevelMap={rootLevelMap}
          stepsProcessingSummaryMap={stepsProcessingSummaryMap}
        />
      ) : (
        <ActionBlockListItem
          processorMetrics={processorMetrics}
          stepRef={stepRef}
          level={level}
          stepUnderEdit={stepUnderEdit}
          rootLevelMap={rootLevelMap}
          stepsProcessingSummaryMap={stepsProcessingSummaryMap}
        />
      )}
    </EuiPanel>
  );
}
