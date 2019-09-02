/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiButton,
  // @ts-ignore
  EuiButtonEmpty,
  // @ts-ignore
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSuperSelect,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import React, { ChangeEvent, Component } from 'react';
import { toastNotifications } from 'ui/notify';
import { User } from '../../../../common/model';
import { UserAPIClient } from '../../../lib/api';

interface Props {
  user: User;
  apiClient: UserAPIClient;
  userLocale: string;
  possibleLocales: string[];
}

interface Option {
  value: string;
  inputDisplay: string;
  'data-test-subj': string;
}

interface State {
  value: string;
  changeInProgress: boolean;
  options: Option[];
}

export class ChangeLocaleForm extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      changeInProgress: false,
      options: this.getOptions(),
      value: this.props.userLocale,
    }
  }
  private getOptions(): Option[] {
    const { possibleLocales } = this.props;
    return possibleLocales.map(locale => ({
      value: locale,
      inputDisplay: locale,
      'data-test-subj': locale,
    }));
  }

  onChange = (value: string) => {
    this.setState({ value });
  };

  onChangeLocaleClick = async () => {
    this.setState({ changeInProgress: true })
    const result = await this.props.apiClient.changeLocale(this.props.user, this.state.value);

    this.setState({ changeInProgress: false })
    console.log('result::', result)
  }

  getHelpText = (editEnabled: boolean) => {
    if (!editEnabled) return null;
    return <FormattedMessage
      id="xpack.security.account.changePasswordForm.changeLocaleRequiresRestartDescription"
      defaultMessage="Changing locale requires a browser refresh."
    />
  }

  public render() {
    const {
      options,
      value,
      changeInProgress,
    } = this.state;
    const editEnabled = options.length > 1;
    return (
      <EuiForm>
        <EuiFormRow
          fullWidth
          helpText={this.getHelpText(editEnabled)}
          label={
            <FormattedMessage
              id="xpack.security.account.changePasswordForm.changeLocaleLabel"
              defaultMessage="Select Locale"
            />
          }
        >
          <EuiFlexGroup alignItems="center" responsive={false}>
            <EuiFlexItem grow>
              <EuiSuperSelect
                fullWidth
                options={options}
                valueOfSelected={value}
                onChange={this.onChange}
                disabled={changeInProgress || !editEnabled}
              />
            </EuiFlexItem>
            {editEnabled && <EuiFlexItem grow={false}>
              <EuiButton
                onClick={this.onChangeLocaleClick}
                fill

                isLoading={changeInProgress}
                data-test-subj="changeLocaleButton"
              >
                <FormattedMessage
                  id="xpack.security.account.changePasswordForm.saveChangesButtonLabel"
                  defaultMessage="Change locale"
                />
              </EuiButton>
            </EuiFlexItem>}
          </EuiFlexGroup>
        </EuiFormRow>
      </EuiForm>
    );
  }
}
