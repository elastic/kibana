/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiPage, EuiPageBody, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import React, { Component } from 'react';
import { getUserDisplayName, AuthenticatedUser } from '../../../../common/model';
import { ChangePassword } from './change_password';
import { ChangeLocale } from './change_locale';
import { PersonalInfo } from './personal_info';

interface Props {
  user: AuthenticatedUser;
  userLocale: string;
  serverRegisteredLocales: string[];
}

export class AccountManagementPage extends Component<Props> {
  public render() {
    const {
      user,
      userLocale,
      serverRegisteredLocales,
    } = this.props;
    return (
      <EuiPage>
        <EuiPageBody restrictWidth>
          <EuiPanel>
            <EuiText data-test-subj={'userDisplayName'}>
              <h1>{getUserDisplayName(user)}</h1>
            </EuiText>

            <EuiSpacer size="xl" />
            <PersonalInfo user={user} />
            <ChangeLocale
              user={user}
              userLocale={userLocale}
              serverRegisteredLocales={serverRegisteredLocales}
            />
            <ChangePassword user={user} />
          </EuiPanel>
        </EuiPageBody>
      </EuiPage>
    );
  }
}
