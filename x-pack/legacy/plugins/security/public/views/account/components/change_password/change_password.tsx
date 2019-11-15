/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  // @ts-ignore
  EuiDescribedFormGroup,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Component } from 'react';
import { UserAPIClient } from '../../../../lib/api';
import { AuthenticatedUser, canUserChangePassword } from '../../../../../common/model';
import { ChangePasswordForm } from '../../../../components/management/change_password_form';

interface Props {
  user: AuthenticatedUser;
}

export class ChangePassword extends Component<Props, {}> {
  public render() {
    const canChangePassword = canUserChangePassword(this.props.user);

    const changePasswordTitle = (
      <FormattedMessage id="xpack.security.account.changePasswordTitle" defaultMessage="Password" />
    );

    if (canChangePassword) {
      return this.getChangePasswordForm(changePasswordTitle);
    }
    return this.getChangePasswordUnavailable(changePasswordTitle);
  }

  private getChangePasswordForm = (changePasswordTitle: React.ReactElement<any>) => {
    return (
      <EuiDescribedFormGroup
        fullWidth
        title={<h2>{changePasswordTitle}</h2>}
        description={
          <p>
            <FormattedMessage
              id="xpack.security.account.changePasswordDescription"
              defaultMessage="Change the password for your account."
            />
          </p>
        }
      >
        <ChangePasswordForm
          user={this.props.user}
          isUserChangingOwnPassword={true}
          apiClient={new UserAPIClient()}
        />
      </EuiDescribedFormGroup>
    );
  };

  private getChangePasswordUnavailable(changePasswordTitle: React.ReactElement<any>) {
    return (
      <EuiDescribedFormGroup
        fullWidth
        title={<h3>{changePasswordTitle}</h3>}
        description={
          <p>
            <FormattedMessage
              id="xpack.security.account.changePasswordNotSupportedText"
              defaultMessage="You cannot change the password for this account."
            />
          </p>
        }
      >
        <div />
      </EuiDescribedFormGroup>
    );
  }
}
