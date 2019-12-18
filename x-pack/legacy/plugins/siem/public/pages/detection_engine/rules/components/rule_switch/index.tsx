/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import styled from 'styled-components';
import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSwitch } from '@elastic/eui';

const StaticSwitch = styled(EuiSwitch)`
  .euiSwitch__thumb,
  .euiSwitch__icon {
    transition: none;
  }
`;

StaticSwitch.displayName = 'StaticSwitch';

export type RuleStateChangeCallback = (isEnabled: boolean, id: string) => void;

export interface RuleSwitchProps {
  id: string;
  enabled: boolean;
  isLoading: boolean;
  onRuleStateChange: RuleStateChangeCallback;
}

/**
 * Basic switch component for displaying loader when enabled/disabled
 */
export const RuleSwitchComponent = ({
  id,
  enabled,
  isLoading,
  onRuleStateChange,
}: RuleSwitchProps) => {
  const handleChange = useCallback(
    e => {
      onRuleStateChange(e.target.checked!, id);
    },
    [onRuleStateChange, id]
  );
  return (
    <EuiFlexGroup alignItems="center" justifyContent="spaceAround">
      <EuiFlexItem grow={false}>
        {isLoading ? (
          <EuiLoadingSpinner size="m" data-test-subj="rule-switch-loader" />
        ) : (
          <StaticSwitch
            data-test-subj="rule-switch"
            label="rule-switch"
            showLabel={false}
            disabled={false}
            checked={enabled ?? false}
            onChange={handleChange}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const RuleSwitch = React.memo(RuleSwitchComponent);

RuleSwitch.displayName = 'RuleSwitch';
