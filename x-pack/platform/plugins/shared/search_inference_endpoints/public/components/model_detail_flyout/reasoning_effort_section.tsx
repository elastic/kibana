/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSpacer, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ReasoningEffortLevel } from '../../../common/types';
import { ReasoningEffortSelector } from './reasoning_effort_selector';

export interface ReasoningEffortSectionProps {
  reasoningAutoMode: boolean;
  onReasoningAutoModeChange: (autoMode: boolean) => void;
  effortLevel: ReasoningEffortLevel;
  onEffortLevelChange: (effortLevel: ReasoningEffortLevel) => void;
  isDisabled: boolean;
}

export const ReasoningEffortSection: React.FC<ReasoningEffortSectionProps> = ({
  reasoningAutoMode,
  onReasoningAutoModeChange,
  effortLevel,
  onEffortLevelChange,
  isDisabled,
}) => (
  <>
    <EuiSpacer size="m" />
    <EuiFormRow
      label={i18n.translate('xpack.searchInferenceEndpoints.addEndpointModal.reasoningLabel', {
        defaultMessage: 'Reasoning',
      })}
      fullWidth
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label={i18n.translate(
              'xpack.searchInferenceEndpoints.addEndpointModal.reasoningSwitchLabel',
              { defaultMessage: 'Customize model reasoning level' }
            )}
            checked={!reasoningAutoMode}
            onChange={(e) => onReasoningAutoModeChange(!e.target.checked)}
            disabled={isDisabled}
            data-test-subj="addEndpointReasoningToggle"
          />
        </EuiFlexItem>
        {!reasoningAutoMode && (
          <EuiFlexItem grow={false}>
            <ReasoningEffortSelector
              effortLevel={effortLevel}
              onEffortLevelChange={onEffortLevelChange}
              isDisabled={isDisabled}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiFormRow>
  </>
);
