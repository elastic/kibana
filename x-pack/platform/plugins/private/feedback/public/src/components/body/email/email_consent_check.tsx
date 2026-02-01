/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ChangeEvent } from 'react';
import { EuiCheckbox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  allowEmailContact: boolean;
  handleChangeAllowEmailContact: (allow: boolean) => void;
}

export const EmailConsentCheck = ({ allowEmailContact, handleChangeAllowEmailContact }: Props) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleChangeAllowEmailContact(e.target.checked);
  };

  return (
    <EuiCheckbox
      id="feedbackFormCheckbox"
      label={i18n.translate('feedback.form.body.checkbox.consentLabel', {
        defaultMessage: 'I agree to being contacted via email regarding my feedback.',
      })}
      checked={allowEmailContact}
      onChange={handleChange}
    />
  );
};
