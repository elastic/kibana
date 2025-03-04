/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton } from '@elastic/eui';
import { useStartTransaction } from '../../../../common/lib/apm/use_start_transaction';
import { RULES_LIST_ACTIONS } from '../../../../common/lib/apm/user_actions';

export interface CreateRuleButtonProps {
  openFlyout: () => void;
}

export const CreateRuleButton = (props: CreateRuleButtonProps) => {
  const { openFlyout } = props;
  const { startTransaction } = useStartTransaction();

  const handleClick = () => {
    startTransaction({ name: RULES_LIST_ACTIONS.CREATE });
    openFlyout();
  };

  return (
    <EuiButton
      iconType="plusInCircle"
      key="create-rule"
      data-test-subj="createRuleButton"
      fill
      onClick={handleClick}
    >
      <FormattedMessage
        id="xpack.triggersActionsUI.sections.rulesList.addRuleButtonLabel"
        defaultMessage="Create rule"
      />
    </EuiButton>
  );
};
