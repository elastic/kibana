/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  useStreamEnrichmentSelector,
  type StreamEnrichmentContextType,
} from '../state_management/stream_enrichment_state_machine';
import { StepsListItem } from './steps_list';
import { isRootStep, isStepUnderEdit } from '../state_management/steps_state_machine';
import { getRootLevelStepsMap } from '../state_management/stream_enrichment_state_machine/utils';
import { useStepsProcessingSummary } from '../state_management/use_steps_processing_summary';
import { CreateStepButton } from '../create_step_button';

export const RootSteps = ({ stepRefs }: { stepRefs: StreamEnrichmentContextType['stepRefs'] }) => {
  const { euiTheme } = useEuiTheme();

  const rootSteps = stepRefs.filter((stepRef) => isRootStep(stepRef.getSnapshot()));

  const rootLevelMap = useStreamEnrichmentSelector((state) => {
    const steps = state.context.stepRefs;
    return getRootLevelStepsMap(steps);
  });

  const stepsProcessingSummaryMap = useStepsProcessingSummary();

  const stepUnderEdit = useStreamEnrichmentSelector((state) => {
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
        />
      ))}
      <EuiFlexGroup alignItems="center" justifyContent="center" wrap>
        <EuiFlexItem grow={false}>
          <CreateStepButton mode="subdued" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
