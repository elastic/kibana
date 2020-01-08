/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiCallOut, EuiFieldText, EuiFormRow, EuiPanel, EuiSpacer } from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React, { ChangeEvent, Component, FormEvent, Fragment, MouseEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import { EuiText } from '@elastic/eui';
import { LoginState } from '../../../../../common/login_state';

interface Props {
  http: any;
  window: any;
  infoMessage?: string;
  loginState: LoginState;
  next: string;
  intl: InjectedIntl;
  loginAssistanceMessage: string;
}

interface State {
  hasError: boolean;
  isLoading: boolean;
  username: string;
  password: string;
  message: string;
}

class BasicLoginFormUI extends Component<Props, State> {
  public state = {
    hasError: false,
    isLoading: false,
    username: '',
    password: '',
    message: '',
  };

  public render() {
    return (
      <Fragment>
        {this.renderLoginAssistanceMessage()}
        {this.renderMessage()}
        <EuiPanel>
          <form onSubmit={this.submit}>
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.security.login.basicLoginForm.usernameFormRowLabel"
                  defaultMessage="Username"
                />
              }
            >
              <EuiFieldText
                id="username"
                name="username"
                data-test-subj="loginUsername"
                value={this.state.username}
                onChange={this.onUsernameChange}
                disabled={this.state.isLoading}
                isInvalid={false}
                aria-required={true}
                inputRef={this.setUsernameInputRef}
              />
            </EuiFormRow>

            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.security.login.basicLoginForm.passwordFormRowLabel"
                  defaultMessage="Password"
                />
              }
            >
              <EuiFieldText
                id="password"
                name="password"
                data-test-subj="loginPassword"
                type="password"
                value={this.state.password}
                onChange={this.onPasswordChange}
                disabled={this.state.isLoading}
                isInvalid={false}
                aria-required={true}
              />
            </EuiFormRow>

            <EuiButton
              fill
              type="submit"
              color="primary"
              onClick={this.submit}
              isLoading={this.state.isLoading}
              data-test-subj="loginSubmit"
            >
              <FormattedMessage
                id="xpack.security.login.basicLoginForm.logInButtonLabel"
                defaultMessage="Log in"
              />
            </EuiButton>
          </form>
        </EuiPanel>
      </Fragment>
    );
  }

  private renderLoginAssistanceMessage = () => {
    return (
      <Fragment>
        <EuiText size="s">
          <ReactMarkdown>{this.props.loginAssistanceMessage}</ReactMarkdown>
        </EuiText>
      </Fragment>
    );
  };

  private renderMessage = () => {
    if (this.state.message) {
      return (
        <Fragment>
          <EuiCallOut
            size="s"
            color="danger"
            data-test-subj="loginErrorMessage"
            title={this.state.message}
            role="alert"
          />
          <EuiSpacer size="l" />
        </Fragment>
      );
    }

    if (this.props.infoMessage) {
      return (
        <Fragment>
          <EuiCallOut
            size="s"
            color="primary"
            data-test-subj="loginInfoMessage"
            title={this.props.infoMessage}
            role="status"
          />
          <EuiSpacer size="l" />
        </Fragment>
      );
    }

    return null;
  };

  private setUsernameInputRef(ref: HTMLInputElement) {
    if (ref) {
      ref.focus();
    }
  }

  private isFormValid = () => {
    const { username, password } = this.state;

    return username && password;
  };

  private onUsernameChange = (e: ChangeEvent<HTMLInputElement>) => {
    this.setState({
      username: e.target.value,
    });
  };

  private onPasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    this.setState({
      password: e.target.value,
    });
  };

  private submit = (e: MouseEvent<HTMLButtonElement> | FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!this.isFormValid()) {
      return;
    }

    this.setState({
      isLoading: true,
      message: '',
    });

    const { http, window, next, intl } = this.props;

    const { username, password } = this.state;

    http.post('./internal/security/login', { username, password }).then(
      () => (window.location.href = next),
      (error: any) => {
        const { statusCode = 500 } = error.data || {};

        let message = intl.formatMessage({
          id: 'xpack.security.login.basicLoginForm.unknownErrorMessage',
          defaultMessage: 'Oops! Error. Try again.',
        });
        if (statusCode === 401) {
          message = intl.formatMessage({
            id: 'xpack.security.login.basicLoginForm.invalidUsernameOrPasswordErrorMessage',
            defaultMessage: 'Invalid username or password. Please try again.',
          });
        }

        this.setState({
          hasError: true,
          message,
          isLoading: false,
        });
      }
    );
  };
}

export const BasicLoginForm = injectI18n(BasicLoginFormUI);
