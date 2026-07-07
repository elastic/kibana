/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode } from 'react';
import { EuiPageTemplate } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface NoPermissionPromptProps {
  /** Overrides the default "No permissions to read rules and alerts" title. */
  title?: ReactNode;
}

export const NoPermissionPrompt = ({ title }: NoPermissionPromptProps = {}) => (
  <EuiPageTemplate.EmptyPrompt
    data-test-subj="noPermissionPrompt"
    iconType="securityApp"
    title={
      <h1>
        {title ?? (
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.rulesList.noPermissionToReadTitle"
            defaultMessage="No permissions to read rules and alerts"
          />
        )}
      </h1>
    }
    body={
      <p data-test-subj="permissionDeniedMessage">
        <FormattedMessage
          id="xpack.triggersActionsUI.sections.rulesList.noPermissionToCreateDescription"
          defaultMessage="Contact your system administrator."
        />
      </p>
    }
  />
);
