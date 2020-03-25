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

import * as i18n from '../../translations';
import { enableRules } from '../../../../../containers/detection_engine/rules';
import { enableRulesAction } from '../../all/actions';
import { Action } from '../../all/reducer';
import { useStateToaster, displayErrorToast } from '../../../../../components/toasters';
import { bucketRulesResponse } from '../../all/helpers';

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
  onChange?: (enabled: boolean) => void;
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
  onChange,
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
          const enabling = event.target.checked!;
          const response = await enableRules({
            ids: [id],
            enabled: enabling,
          });
          const { rules, errors } = bucketRulesResponse(response);

          if (errors.length > 0) {
            setMyIsLoading(false);
            const title = enabling
              ? i18n.BATCH_ACTION_ACTIVATE_SELECTED_ERROR(1)
              : i18n.BATCH_ACTION_DEACTIVATE_SELECTED_ERROR(1);
            displayErrorToast(
              title,
              errors.map(e => e.error.message),
              dispatchToaster
            );
          } else {
            const [rule] = rules;
            setMyEnabled(rule.enabled);
            if (onChange != null) {
              onChange(rule.enabled);
            }
          }
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
