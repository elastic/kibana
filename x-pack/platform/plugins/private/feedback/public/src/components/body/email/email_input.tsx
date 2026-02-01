/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { EuiFieldText } from '@elastic/eui';
import type { SecurityServiceStart } from '@kbn/core/public';
import { getUserEmail } from '../../../utils';

interface Props {
  email: string;
  security?: SecurityServiceStart;
  handleChangeEmail: (email: string) => void;
}

export const EmailInput = ({ email, security, handleChangeEmail }: Props) => {
  const hasFetchedEmailRef = useRef(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleChangeEmail(e.target.value);
  };

  useEffect(() => {
    const fetchEmail = async () => {
      if (!security || email || hasFetchedEmailRef.current) {
        return;
      }

      const userEmail = await getUserEmail(security);

      hasFetchedEmailRef.current = true;
      if (userEmail) {
        handleChangeEmail(userEmail);
      }
    };

    fetchEmail();
  }, [security, email, handleChangeEmail]);

  return <EuiFieldText onChange={handleChange} type="email" value={email} compressed />;
};
