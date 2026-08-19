/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonGroup, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ReasoningEffortLevel } from '../../../common/types';
import { isReasoningEffortLevel } from '../../../common/type_guards';
import { ReasoningTokenUsageNote } from './reasoning_token_usage_note';

const REASONING_EFFORT_OPTIONS: Array<{
  id: ReasoningEffortLevel;
  label: string;
  'data-test-subj': string;
}> = [
  {
    id: 'none',
    label: i18n.translate('xpack.searchInferenceEndpoints.addEndpointModal.reasoningEffortNone', {
      defaultMessage: 'none',
    }),
    'data-test-subj': 'addEndpointReasoningEffort-none',
  },
  {
    id: 'minimal',
    label: i18n.translate('xpack.searchInferenceEndpoints.addEndpointModal.reasoningEffortMin', {
      defaultMessage: 'min',
    }),
    'data-test-subj': 'addEndpointReasoningEffort-minimal',
  },
  {
    id: 'low',
    label: i18n.translate('xpack.searchInferenceEndpoints.addEndpointModal.reasoningEffortLow', {
      defaultMessage: 'low',
    }),
    'data-test-subj': 'addEndpointReasoningEffort-low',
  },
  {
    id: 'medium',
    label: i18n.translate('xpack.searchInferenceEndpoints.addEndpointModal.reasoningEffortMedium', {
      defaultMessage: 'med',
    }),
    'data-test-subj': 'addEndpointReasoningEffort-medium',
  },
  {
    id: 'high',
    label: i18n.translate('xpack.searchInferenceEndpoints.addEndpointModal.reasoningEffortHigh', {
      defaultMessage: 'high',
    }),
    'data-test-subj': 'addEndpointReasoningEffort-high',
  },
  {
    id: 'xhigh',
    label: i18n.translate(
      'xpack.searchInferenceEndpoints.addEndpointModal.reasoningEffortExtraHigh',
      { defaultMessage: 'xhigh' }
    ),
    'data-test-subj': 'addEndpointReasoningEffort-xhigh',
  },
];

export interface ReasoningEffortSelectorProps {
  effortLevel: ReasoningEffortLevel;
  onEffortLevelChange: (effortLevel: ReasoningEffortLevel) => void;
  isDisabled: boolean;
}

export const ReasoningEffortSelector: React.FC<ReasoningEffortSelectorProps> = ({
  effortLevel,
  onEffortLevelChange,
  isDisabled,
}) => (
  <EuiFlexGroup direction="column" gutterSize="xs">
    <EuiFlexItem grow={false}>
      <EuiButtonGroup
        legend={i18n.translate(
          'xpack.searchInferenceEndpoints.addEndpointModal.reasoningEffortLegend',
          { defaultMessage: 'Reasoning effort level' }
        )}
        type="single"
        isFullWidth
        buttonSize="compressed"
        idSelected={effortLevel}
        onChange={(id) => {
          if (isReasoningEffortLevel(id)) {
            onEffortLevelChange(id);
          }
        }}
        isDisabled={isDisabled}
        options={REASONING_EFFORT_OPTIONS}
        data-test-subj="addEndpointReasoningButtonGroup"
      />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <ReasoningTokenUsageNote />
    </EuiFlexItem>
  </EuiFlexGroup>
);
