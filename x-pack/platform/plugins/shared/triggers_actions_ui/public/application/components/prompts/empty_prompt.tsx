/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiPageTemplate } from '@elastic/eui';

export const EmptyPrompt = ({
  onCreateRulesClick,
  showCreateRule = true,
}: {
  onCreateRulesClick: () => void;
  showCreateRule: boolean;
}) => {
  const renderActions = () => {
    if (showCreateRule) {
      return [
        <EuiButton
          iconType="plusInCircle"
          data-test-subj="createFirstRuleButton"
          key="create-action"
          fill
          onClick={onCreateRulesClick}
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.components.emptyPrompt.emptyButton"
            defaultMessage="Create rule"
          />
        </EuiButton>,
      ];
    }
    return null;
  };

  return (
    <EuiPageTemplate.EmptyPrompt
      iconType="watchesApp"
      data-test-subj="createFirstRuleEmptyPrompt"
      title={
        <h2>
          <FormattedMessage
            id="xpack.triggersActionsUI.components.emptyPrompt.emptyTitle"
            defaultMessage="Create your first rule"
          />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.triggersActionsUI.components.emptyPrompt.emptyDesc"
            defaultMessage="Receive an alert through email, Slack, or another connector when a condition is met."
          />
        </p>
      }
      actions={renderActions()}
    />
  );
};
