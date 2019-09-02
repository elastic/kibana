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
import { AuthenticatedUser } from '../../../../../common/model';
import { ChangeLocaleForm } from '../../../../components/management/change_locale_form';

interface Props {
  user: AuthenticatedUser;
  userLocale: string;
  serverRegisteredLocales: string[];
}

export class ChangeLocale extends Component<Props> {
  public render() {
    const { user, userLocale, serverRegisteredLocales } = this.props;
    console.log('serverRegisteredLocales::', serverRegisteredLocales)
    return (
      <EuiDescribedFormGroup
        fullWidth
        title={
          <h3>
            <FormattedMessage
              id="xpack.security.account.changeLocaleTitle"
              defaultMessage="Locale"
            />
          </h3>
        }
        description={<p>
          <FormattedMessage
            id="xpack.security.account.changeLocaleDescription"
            defaultMessage="Change the locale for your account. "
          />
        </p>}
      >
        <ChangeLocaleForm
          user={user}
          userLocale={userLocale}
          possibleLocales={serverRegisteredLocales}
          apiClient={new UserAPIClient()}
        />
      </EuiDescribedFormGroup>
    )
  }
}
