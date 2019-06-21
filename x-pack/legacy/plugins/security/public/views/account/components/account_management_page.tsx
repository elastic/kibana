/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiPage, EuiPageBody, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import React, { Component } from 'react';
import { getUserDisplayName, AuthenticatedUser } from '../../../../common/model';
import { ChangePassword } from './change_password';
import { PersonalInfo } from './personal_info';

interface Props {
  user: AuthenticatedUser;
}

export class AccountManagementPage extends Component<Props, {}> {
  constructor(props: Props) {
    super(props);
  }

  public render() {
    return (
      <EuiPage>
        <EuiPageBody restrictWidth>
          <EuiPanel>
            <EuiText data-test-subj={'userDisplayName'}>
              <h1>{getUserDisplayName(this.props.user)}</h1>
            </EuiText>

            <EuiSpacer size="xl" />

            <PersonalInfo user={this.props.user} />

            <ChangePassword user={this.props.user} />
          </EuiPanel>
        </EuiPageBody>
      </EuiPage>
    );
  }
}
