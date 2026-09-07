/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIllustration,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { taskAutomation } from '@elastic/eui-illustrations';
import type { RuleSystemAction } from '@kbn/alerting-types';
import React, { useCallback, useMemo } from 'react';
import type { RuleAction } from '../common/types';
import { MULTI_CONSUMER_RULE_TYPE_IDS } from '../constants';
import { useRuleFormState, useRuleFormScreenContext } from '../hooks';
import {
  ADD_ACTION_DESCRIPTION_TEXT,
  ADD_ACTION_HEADER,
  OPTIONAL_LABEL,
  ADD_ACTION_TEXT,
} from '../translations';
import { RuleActionsItem } from './rule_actions_item';
import { RuleActionsSystemActionsItem } from './rule_actions_system_actions_item';

export const RuleActions = () => {
  const { setIsConnectorsScreenVisible } = useRuleFormScreenContext();

  const {
    formData: { actions, consumer },
    multiConsumerSelection,
    selectedRuleType,
    connectorTypes,
  } = useRuleFormState();

  const onModalOpen = useCallback(() => {
    setIsConnectorsScreenVisible(true);
  }, [setIsConnectorsScreenVisible]);

  const producerId = useMemo(() => {
    if (MULTI_CONSUMER_RULE_TYPE_IDS.includes(selectedRuleType.id)) {
      return multiConsumerSelection || consumer;
    }
    return selectedRuleType.producer;
  }, [consumer, multiConsumerSelection, selectedRuleType]);

  const hasActions = actions.length > 0;

  return (
    <>
      <EuiFlexGroup data-test-subj="ruleActions" direction="column">
        {actions.map((action, index) => {
          const isSystemAction = connectorTypes.some((connectorType) => {
            return connectorType.id === action.actionTypeId && connectorType.isSystemActionType;
          });

          return (
            <EuiFlexItem key={action.uuid}>
              {isSystemAction && (
                <RuleActionsSystemActionsItem
                  action={action as RuleSystemAction}
                  index={index}
                  producerId={producerId}
                />
              )}
              {!isSystemAction && (
                <RuleActionsItem
                  action={action as RuleAction}
                  index={index}
                  producerId={producerId}
                />
              )}
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
      {!hasActions && (
        <EuiFlexGroup justifyContent="center">
          <EuiFlexGroup
            alignItems="center"
            direction="column"
            gutterSize="m"
            style={{ maxWidth: 356 }}
          >
            <EuiIllustration
              type={taskAutomation}
              alt="Rule actions illustration"
              style={{ maxInlineSize: 180, marginInline: 'auto' }}
            />
            <EuiFlexItem>
              <EuiText textAlign="center">
                <h3>{ADD_ACTION_HEADER}</h3>
              </EuiText>
              <EuiText size="s" textAlign="center" color="subdued">
                {OPTIONAL_LABEL}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s" textAlign="center" color="subdued">
                {ADD_ACTION_DESCRIPTION_TEXT}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexGroup>
      )}
      <EuiSpacer />
      <EuiFlexGroup justifyContent={!hasActions ? 'center' : 'flexStart'}>
        <EuiFlexItem grow={0}>
          <EuiButton
            data-test-subj="ruleActionsAddActionButton"
            iconType="send"
            iconSide="left"
            onClick={onModalOpen}
          >
            {ADD_ACTION_TEXT}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
