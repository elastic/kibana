/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useInteractiveModeSelector } from '../state_management/stream_enrichment_state_machine';
import { StepsListItem } from './steps_list';
import { isRootStep, isStepUnderEdit } from '../state_management/steps_state_machine';
import { getRootLevelStepsMap } from '../state_management/stream_enrichment_state_machine/utils';
import { useStepsProcessingSummary } from '../hooks/use_steps_processing_summary';
import type { InteractiveModeContext } from '../state_management/interactive_mode_machine';
import { ProcessingButtonsManual } from '../empty_prompts';

export const RootSteps = ({
  stepRefs,
  readOnly = false,
}: {
  stepRefs: InteractiveModeContext['stepRefs'];
  readOnly?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();

  const rootSteps = stepRefs.filter((stepRef) => isRootStep(stepRef.getSnapshot()));

  const rootLevelMap = useInteractiveModeSelector((state) => {
    const steps = state.context.stepRefs;
    return getRootLevelStepsMap(steps);
  });

  const stepsProcessingSummaryMap = useStepsProcessingSummary();

  const stepUnderEdit = useInteractiveModeSelector((state) => {
    const underEdit = state.context.stepRefs.find((stepRef) =>
      isStepUnderEdit(stepRef.getSnapshot())
    );
    return underEdit ? underEdit.getSnapshot().context.step : undefined;
  });

  return (
    <EuiPanel
      data-test-subj="streamsAppStreamDetailEnrichmentRootSteps"
      hasShadow={false}
      borderRadius="none"
      css={css`
        overflow: auto;
        background: none;
        padding: ${euiTheme.size.xs};
        // Root panels
        > .euiPanel {
          margin-bottom: ${euiTheme.size.s};
        }
      `}
    >
      {rootSteps.map((stepRef, index) => (
        <StepsListItem
          key={stepRef.id}
          stepRef={stepRef}
          level={0}
          stepUnderEdit={stepUnderEdit}
          rootLevelMap={rootLevelMap}
          stepsProcessingSummaryMap={stepsProcessingSummaryMap}
          isFirstStepInLevel={index === 0}
          isLastStepInLevel={index === rootSteps.length - 1}
          readOnly={readOnly}
        />
      ))}
      {!readOnly && (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup alignItems="center" justifyContent="center" wrap>
            <EuiFlexItem grow={false}>
              <ProcessingButtonsManual center={true} color="primary" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </EuiPanel>
  );
};
