/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import type { SecurityServiceStart } from '@kbn/core/public';
import { EmailInput } from './email_input';
import { EmailConsentCheck } from './email_consent_check';

interface Props {
  email: string;
  allowEmailContact: boolean;
  security?: SecurityServiceStart;
  handleChangeAllowEmailContact: (allow: boolean) => void;
  handleChangeEmail: (email: string) => void;
}

export const EmailSection = ({
  email,
  allowEmailContact,
  security,
  handleChangeAllowEmailContact,
  handleChangeEmail,
}: Props) => {
  return (
    <EuiFormRow fullWidth>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EmailConsentCheck
            allowEmailContact={allowEmailContact}
            handleChangeAllowEmailContact={handleChangeAllowEmailContact}
          />
        </EuiFlexItem>
        {allowEmailContact && (
          <EuiFlexItem>
            <EmailInput email={email} security={security} handleChangeEmail={handleChangeEmail} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
