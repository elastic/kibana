/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSuperSelect } from '@elastic/eui';
import React from 'react';
import { pure } from 'recompose';
import { ActionCreator } from 'typescript-fsa';

import { FlowDirection, FlowTarget } from '../../graphql/types';

import * as i18n from './translations';

const toggleTargetOptions = (id: string, displayText: string[]) => [
  {
    id: `${id}-select-flow-target-${FlowTarget.source}`,
    value: FlowTarget.source,
    inputDisplay: displayText[0] || i18n.SOURCE,
    directions: [FlowDirection.uniDirectional, FlowDirection.biDirectional],
  },
  {
    id: `${id}-select-flow-target-${FlowTarget.destination}`,
    value: FlowTarget.destination,
    inputDisplay: displayText[1] || i18n.DESTINATION,
    directions: [FlowDirection.uniDirectional, FlowDirection.biDirectional],
  },
  {
    id: `${id}-select-flow-target-${FlowTarget.client}`,
    value: FlowTarget.client,
    inputDisplay: displayText[2] || i18n.CLIENT,
    directions: [FlowDirection.biDirectional],
  },
  {
    id: `${id}-select-flow-target-${FlowTarget.server}`,
    value: FlowTarget.server,
    inputDisplay: displayText[3] || i18n.SERVER,
    directions: [FlowDirection.biDirectional],
  },
];

interface OwnProps {
  id: string;
  isLoading: boolean;
  selectedTarget: FlowTarget;
  displayTextOverride?: string[];
  selectedDirection?: FlowDirection;
  updateFlowTargetAction: ActionCreator<{ flowTarget: FlowTarget }>;
}

const onChangeTarget = (
  flowTarget: FlowTarget,
  updateFlowTargetSelectAction: ActionCreator<{ flowTarget: FlowTarget }>
) => {
  updateFlowTargetSelectAction({ flowTarget });
};

export type FlowTargetSelectProps = OwnProps;

export const FlowTargetSelect = pure<FlowTargetSelectProps>(
  ({
    id,
    isLoading = false,
    selectedDirection,
    selectedTarget,
    displayTextOverride = [],
    updateFlowTargetAction,
  }) => (
    <EuiSuperSelect
      options={
        selectedDirection
          ? toggleTargetOptions(id, displayTextOverride).filter(option =>
              option.directions.includes(selectedDirection)
            )
          : toggleTargetOptions(id, displayTextOverride)
      }
      valueOfSelected={selectedTarget}
      onChange={(newFlowTarget: FlowTarget) =>
        onChangeTarget(newFlowTarget, updateFlowTargetAction)
      }
      isLoading={isLoading}
    />
  )
);
