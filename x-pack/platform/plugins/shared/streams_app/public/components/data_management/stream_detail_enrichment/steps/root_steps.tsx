/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  useStreamEnrichmentSelector,
  type StreamEnrichmentContextType,
} from '../state_management/stream_enrichment_state_machine';
import { StepsListItem } from './steps_list';
import { isRootStep, isStepUnderEdit } from '../state_management/steps_state_machine';
import { getRootLevelStepsMap } from '../state_management/stream_enrichment_state_machine/utils';

export const RootSteps = ({ stepRefs }: { stepRefs: StreamEnrichmentContextType['stepRefs'] }) => {
  const { euiTheme } = useEuiTheme();

  const rootSteps = stepRefs.filter((stepRef) => isRootStep(stepRef.getSnapshot()));

  const rootLevelMap = useStreamEnrichmentSelector((state) => {
    const steps = state.context.stepRefs;
    return getRootLevelStepsMap(steps);
  });

  const stepUnderEdit = useStreamEnrichmentSelector((state) => {
    const underEdit = state.context.stepRefs.find((stepRef) =>
      isStepUnderEdit(stepRef.getSnapshot())
    );
    return underEdit ? underEdit.getSnapshot().context.step : undefined;
  });

  return (
    <EuiPanel
      hasShadow={false}
      borderRadius="none"
      css={css`
        overflow: auto;
        padding: ${euiTheme.size.m};
        // Root panels
        > .euiPanel {
          margin-bottom: ${euiTheme.size.m};
        }
      `}
    >
      {rootSteps.map((stepRef) => (
        <StepsListItem
          key={stepRef.id}
          stepRef={stepRef}
          level={0}
          stepUnderEdit={stepUnderEdit}
          rootLevelMap={rootLevelMap}
        />
      ))}
    </EuiPanel>
  );
};
