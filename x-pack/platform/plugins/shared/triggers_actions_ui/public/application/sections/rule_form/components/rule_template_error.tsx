/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiText } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

export const RuleTemplateError = ({ error }: { error: Error | null }) => {
  if (!error) return null;

  return (
    <EuiEmptyPrompt
      iconType="error"
      color="danger"
      title={
        <EuiText color="default">
          <h2>
            <FormattedMessage
              id="xpack.triggersActionsUI.ruleForm.templateErrorTitle"
              defaultMessage="Unable to load your rule template"
            />
          </h2>
        </EuiText>
      }
      body={
        <EuiText>
          <p>{error.message}</p>
        </EuiText>
      }
    />
  );
};
