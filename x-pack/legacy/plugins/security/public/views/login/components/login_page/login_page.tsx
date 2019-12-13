/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';

import {
  // @ts-ignore
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import classNames from 'classnames';
import { LoginState } from '../../../../../common/login_state';
import { BasicLoginForm } from '../basic_login_form';
import { DisabledLoginForm } from '../disabled_login_form';

interface Props {
  http: any;
  window: any;
  next: string;
  infoMessage?: string;
  loginState: LoginState;
  isSecureConnection: boolean;
  requiresSecureConnection: boolean;
  loginAssistanceMessage: string;
}

export class LoginPage extends Component<Props, {}> {
  public render() {
    const allowLogin = this.allowLogin();

    const contentHeaderClasses = classNames('loginWelcome__content', 'eui-textCenter', {
      ['loginWelcome__contentDisabledForm']: !allowLogin,
    });

    const contentBodyClasses = classNames('loginWelcome__content', 'loginWelcome-body', {
      ['loginWelcome__contentDisabledForm']: !allowLogin,
    });

    return (
      <div className="loginWelcome login-form">
        <header className="loginWelcome__header">
          <div className={contentHeaderClasses}>
            <EuiSpacer size="xxl" />
            <span className="loginWelcome__logo">
              <EuiIcon type="logoKibana" size="xxl" />
            </span>
            <EuiTitle size="l" className="loginWelcome__title">
              <h1>
                <FormattedMessage
                  id="xpack.security.loginPage.welcomeTitle"
                  defaultMessage="Welcome to Kibana"
                />
              </h1>
            </EuiTitle>
            <EuiText size="s" color="subdued" className="loginWelcome__subtitle">
              <p>
                <FormattedMessage
                  id="xpack.security.loginPage.welcomeDescription"
                  defaultMessage="Your window into the Elastic Stack"
                />
              </p>
            </EuiText>
            <EuiSpacer size="xl" />
          </div>
        </header>
        <div className={contentBodyClasses}>
          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem>{this.getLoginForm()}</EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </div>
    );
  }

  private allowLogin = () => {
    if (this.props.requiresSecureConnection && !this.props.isSecureConnection) {
      return false;
    }

    return this.props.loginState.allowLogin && this.props.loginState.layout === 'form';
  };

  private getLoginForm = () => {
    if (this.props.requiresSecureConnection && !this.props.isSecureConnection) {
      return (
        <DisabledLoginForm
          title={
            <FormattedMessage
              id="xpack.security.loginPage.requiresSecureConnectionTitle"
              defaultMessage="A secure connection is required for log in"
            />
          }
          message={
            <FormattedMessage
              id="xpack.security.loginPage.requiresSecureConnectionMessage"
              defaultMessage="Contact your system administrator."
            />
          }
        />
      );
    }

    const layout = this.props.loginState.layout;
    switch (layout) {
      case 'form':
        return <BasicLoginForm {...this.props} />;
      case 'error-es-unavailable':
        return (
          <DisabledLoginForm
            title={
              <FormattedMessage
                id="xpack.security.loginPage.esUnavailableTitle"
                defaultMessage="Cannot connect to the Elasticsearch cluster"
              />
            }
            message={
              <FormattedMessage
                id="xpack.security.loginPage.esUnavailableMessage"
                defaultMessage="See the Kibana logs for details and try reloading the page."
              />
            }
          />
        );
      case 'error-xpack-unavailable':
        return (
          <DisabledLoginForm
            title={
              <FormattedMessage
                id="xpack.security.loginPage.xpackUnavailableTitle"
                defaultMessage="Cannot connect to the Elasticsearch cluster currently configured for Kibana."
              />
            }
            message={
              <FormattedMessage
                id="xpack.security.loginPage.xpackUnavailableMessage"
                defaultMessage="To use the full set of free features in this distribution of Kibana, please update Elasticsearch to the default distribution."
              />
            }
          />
        );
      default:
        return (
          <DisabledLoginForm
            title={
              <FormattedMessage
                id="xpack.security.loginPage.unknownLayoutTitle"
                defaultMessage="Unsupported login form layout."
              />
            }
            message={
              <FormattedMessage
                id="xpack.security.loginPage.unknownLayoutMessage"
                defaultMessage="Refer to the Kibana logs for more details and refresh to try again."
              />
            }
          />
        );
    }
  };
}
