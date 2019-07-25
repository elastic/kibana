/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFilterButton, EuiFilterGroup } from '@elastic/eui';
import React from 'react';
import { pure } from 'recompose';
import { ActionCreator } from 'typescript-fsa';

import { FlowTarget } from '../../graphql/types';

import * as i18n from './translations';

interface OwnProps {
  selectedTarget: FlowTarget;
  displayTextOverride?: string[];
  updateFlowTarget: ActionCreator<{ flowTarget: FlowTarget }>;
}

const onChangeTarget = (
  flowTarget: FlowTarget,
  updateFlowTarget: ActionCreator<{ flowTarget: FlowTarget }>
) => {
  updateFlowTarget({ flowTarget });
};

const onClearTarget = (updateFlowTarget: ActionCreator<{ flowTarget: FlowTarget }>) => {
  updateFlowTarget({ flowTarget: FlowTarget.unified });
};

export type FlowTargetFilterGroupProps = OwnProps;

export const FlowTargetFilterGroup = pure<FlowTargetFilterGroupProps>(
  ({ selectedTarget, displayTextOverride = [], updateFlowTarget }) => (
    <EuiFilterGroup>
      <EuiFilterButton
        withNext
        hasActiveFilters={selectedTarget === FlowTarget.source}
        onClick={() =>
          selectedTarget === FlowTarget.source
            ? onClearTarget(updateFlowTarget)
            : onChangeTarget(FlowTarget.source, updateFlowTarget)
        }
        data-test-subj={FlowTarget.source}
      >
        {displayTextOverride[0] || i18n.SOURCE}
      </EuiFilterButton>

      <EuiFilterButton
        hasActiveFilters={selectedTarget === FlowTarget.destination}
        onClick={() =>
          selectedTarget === FlowTarget.destination
            ? onClearTarget(updateFlowTarget)
            : onChangeTarget(FlowTarget.destination, updateFlowTarget)
        }
        data-test-subj={FlowTarget.destination}
      >
        {displayTextOverride[1] || i18n.DESTINATION}
      </EuiFilterButton>
    </EuiFilterGroup>
  )
);
