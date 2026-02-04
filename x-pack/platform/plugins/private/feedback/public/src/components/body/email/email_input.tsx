/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { ChangeEvent } from 'react';
import { EuiFieldText, EuiFormRow, EuiFormErrorText } from '@elastic/eui';
import type { SecurityServiceStart } from '@kbn/core/public';
import { parseOneAddress } from 'email-addresses';
import { i18n } from '@kbn/i18n';

interface Props {
  email: string;
  security?: SecurityServiceStart;
  handleChangeEmail: (email: string) => void;
  onValidationChange: (isValid: boolean) => void;
}

const validateEmail = (value: string): boolean => {
  if (!value) {
    return false;
  }
  try {
    const parsed = parseOneAddress(value);
    return parsed !== null;
  } catch {
    return false;
  }
};

export const EmailInput = ({ email, security, handleChangeEmail, onValidationChange }: Props) => {
  const hasFetchedEmailRef = useRef(false);
  const [touched, setTouched] = useState(false);

  const isValid = useMemo(() => validateEmail(email), [email]);

  const showError = touched && !isValid;

  useEffect(() => {
    onValidationChange(isValid);
  }, [isValid, onValidationChange]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleChangeEmail(e.target.value);
  };

  const handleBlur = () => {
    setTouched(true);
  };

  useEffect(() => {
    const fetchEmail = async () => {
      if (!security || email || hasFetchedEmailRef.current) {
        return;
      }

      try {
        const user = await security.authc.getCurrentUser();
        if (user?.email) {
          handleChangeEmail(user.email);
        }
      } catch {
        handleChangeEmail('');
      } finally {
        hasFetchedEmailRef.current = true;
      }
    };

    fetchEmail();
  }, [security, email, handleChangeEmail]);

  return (
    <>
      <EuiFormRow>
        <EuiFieldText
          data-test-subj="feedbackEmailInput"
          onChange={handleChange}
          onBlur={handleBlur}
          type="email"
          value={email}
          isInvalid={showError}
          placeholder={i18n.translate('feedback.emailInput.placeholder', {
            defaultMessage: 'Your email',
          })}
        />
      </EuiFormRow>
      {showError && (
        <EuiFormErrorText>
          {i18n.translate('feedback.emailInput.errorMessage', {
            defaultMessage: 'Enter a valid email address',
          })}
        </EuiFormErrorText>
      )}
    </>
  );
};
