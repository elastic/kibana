/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import styled from 'styled-components';
import React, { Dispatch, SetStateAction, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSwitch } from '@elastic/eui';

const StaticSwitch = styled(EuiSwitch)`
  .euiSwitch__thumb,
  .euiSwitch__icon {
    transition: none;
  }
`;

StaticSwitch.displayName = 'StaticSwitch';

export interface RuleSwitchProps {
  ruleId: string;
  isEnabled: boolean;
  onRuleStateChange: (
    isEnabled: boolean,
    ruleId: string,
    setIsLoading: Dispatch<SetStateAction<boolean>>
  ) => void;
}

export const RuleSwitch = React.memo<RuleSwitchProps>(
  ({ ruleId, isEnabled, onRuleStateChange }) => {
    const [isLoading, setIsLoading] = useState(false);

    return (
      <EuiFlexGroup justifyContent="spaceAround">
        <EuiFlexItem grow={false}>
          {isLoading ? (
            <EuiLoadingSpinner size="m" data-test-subj="job-switch-loader" />
          ) : (
            <StaticSwitch
              data-test-subj="job-switch"
              disabled={false}
              checked={isEnabled}
              onChange={e => {
                setIsLoading(true);
                onRuleStateChange(e.target.checked, ruleId, setIsLoading);
              }}
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

RuleSwitch.displayName = 'RuleSwitch';
