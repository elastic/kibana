/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';

import { AppHeader } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';

import { UserForm } from './user_form';
import { useCapabilities } from '../../../components/use_capabilities';

const usersListTitle = i18n.translate('xpack.security.management.users.usersTitle', {
  defaultMessage: 'Users',
});

const createUserPageTitle = i18n.translate('xpack.security.management.users.createUserPage.title', {
  defaultMessage: 'Create user',
});

export const CreateUserPage: FunctionComponent = () => {
  const history = useHistory();
  const readOnly = !useCapabilities('users').save;
  const backToUsers = () => {
    if (history.length > 1) {
      history.goBack();
    } else {
      history.push('/');
    }
  };

  useEffect(() => {
    if (readOnly) {
      backToUsers();
    }
  }, [readOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <AppHeader
        title={createUserPageTitle}
        back={{
          href: history.createHref({ pathname: '/' }),
          label: usersListTitle,
        }}
        spacing="bleed"
      />

      <EuiSpacer size="l" />

      <UserForm isNewUser onCancel={backToUsers} onSuccess={backToUsers} />
    </>
  );
};
