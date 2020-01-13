/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSwitch,
  EuiSwitchEvent,
} from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import styled from 'styled-components';
import React, { useCallback, useState, useEffect } from 'react';

import { enableRules } from '../../../../../containers/detection_engine/rules';
import { enableRulesAction } from '../../all/actions';
import { Action } from '../../all/reducer';
import { useStateToaster } from '../../../../../components/toasters';

const StaticSwitch = styled(EuiSwitch)`
  .euiSwitch__thumb,
  .euiSwitch__icon {
    transition: none;
  }
`;

StaticSwitch.displayName = 'StaticSwitch';

export interface RuleSwitchProps {
  dispatch?: React.Dispatch<Action>;
  id: string;
  enabled: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
  optionLabel?: string;
}

/**
 * Basic switch component for displaying loader when enabled/disabled
 */
export const RuleSwitchComponent = ({
  dispatch,
  id,
  isDisabled,
  isLoading,
  enabled,
  optionLabel,
}: RuleSwitchProps) => {
  const [myIsLoading, setMyIsLoading] = useState(false);
  const [myEnabled, setMyEnabled] = useState(enabled ?? false);
  const [, dispatchToaster] = useStateToaster();

  const onRuleStateChange = useCallback(
    async (event: EuiSwitchEvent) => {
      setMyIsLoading(true);
      if (dispatch != null) {
        await enableRulesAction([id], event.target.checked!, dispatch, dispatchToaster);
      } else {
        try {
          const updatedRules = await enableRules({
            ids: [id],
            enabled: event.target.checked!,
          });
          setMyEnabled(updatedRules[0].enabled);
        } catch {
          setMyIsLoading(false);
        }
      }
      setMyIsLoading(false);
    },
    [dispatch, id]
  );

  useEffect(() => {
    if (myEnabled !== enabled) {
      setMyEnabled(enabled);
    }
  }, [enabled]);

  useEffect(() => {
    if (myIsLoading !== isLoading) {
      setMyIsLoading(isLoading ?? false);
    }
  }, [isLoading]);

  return (
    <EuiFlexGroup alignItems="center" justifyContent="spaceAround">
      <EuiFlexItem grow={false}>
        {myIsLoading ? (
          <EuiLoadingSpinner size="m" data-test-subj="rule-switch-loader" />
        ) : (
          <StaticSwitch
            data-test-subj="rule-switch"
            label={optionLabel ?? ''}
            showLabel={!isEmpty(optionLabel)}
            disabled={isDisabled}
            checked={myEnabled}
            onChange={onRuleStateChange}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const RuleSwitch = React.memo(RuleSwitchComponent);

RuleSwitch.displayName = 'RuleSwitch';
