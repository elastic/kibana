/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiImage,
  EuiSpacer,
  EuiText,
  type EuiThemeComputed,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import type { Subscription } from 'rxjs';
import { BehaviorSubject } from 'rxjs';

import type {
  AppMountParameters,
  CustomBrandingStart,
  FatalErrorsStart,
  HttpStart,
  NotificationsStart,
} from '@kbn/core/public';
import type { CustomBranding } from '@kbn/core-custom-branding-common';
import { kbnFullScreenBgCss } from '@kbn/css-utils/public/full_screen_bg_css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { LoginFormProps } from './components';
import { DisabledLoginForm, LoginForm, LoginFormMessageType } from './components';
import type { StartServices } from '../..';
import {
  AUTH_PROVIDER_HINT_QUERY_STRING_PARAMETER,
  LOGOUT_REASON_QUERY_STRING_PARAMETER,
} from '../../../common/constants';
import type { LoginState } from '../../../common/login_state';
import type { LogoutReason } from '../../../common/types';
import type { ConfigType } from '../../config';

// Check if current date is within Valentine's period (Feb 1-14)
const isValentinesPeriod = (): boolean => {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed (Jan = 0, Feb = 1)
  const day = now.getDate();
  return month === 1 && day >= 1 && day <= 14;
};

// Heart icon using Elastic brand colours, shown during Valentine's period
const HeartIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="64"
    height="64"
    viewBox="0 0 100 100"
    shapeRendering="geometricPrecision"
  >
    <defs>
      <clipPath id="loginHeartClip" clipPathUnits="userSpaceOnUse">
        <path d="M50 25 C50 12 42 4 30 4 C16 4 5 16 5 30 C12 48 28 72 50 95 C72 72 88 48 95 30 C95 16 84 4 70 4 C58 4 50 12 50 25 Z" />
      </clipPath>
    </defs>
    <g clipPath="url(#loginHeartClip)">
      <path fill="#EE5097" d="M0 0 L50 0 L33 20 L0 26 Z" />
      <path fill="#FDD009" d="M50 0 L100 0 L100 38 L58 38 L46 44 L33 20 Z" />
      <path fill="#17A7E0" d="M0 26 L33 20 L46 44 L0 56 Z" />
      <path fill="#23BAB1" d="M0 56 L46 44 L58 38 L64 66 L50 100 L0 100 Z" />
      <path fill="#0678A0" d="M100 38 L58 38 L64 66 L100 52 Z" />
      <path fill="#92C73D" d="M100 52 L64 66 L50 100 L100 100 Z" />
    </g>
  </svg>
);

interface Props {
  http: HttpStart;
  notifications: NotificationsStart;
  fatalErrors: FatalErrorsStart;
  loginAssistanceMessage: string;
  sameSiteCookies?: ConfigType['sameSiteCookies'];
  customBranding: CustomBrandingStart;
}

interface State {
  loginState: LoginState | null;
  customBranding: CustomBranding;
}

const loginFormMessages: Record<LogoutReason, NonNullable<LoginFormProps['message']>> = {
  SESSION_EXPIRED: {
    type: LoginFormMessageType.Info,
    content: i18n.translate('xpack.security.login.sessionExpiredDescription', {
      defaultMessage: 'Your session has timed out. Please log in again.',
    }),
  },
  CONCURRENCY_LIMIT: {
    type: LoginFormMessageType.Info,
    content: i18n.translate('xpack.security.login.concurrencyLimitDescription', {
      defaultMessage: 'You have logged in on another device. Please log in again.',
    }),
  },
  AUTHENTICATION_ERROR: {
    type: LoginFormMessageType.Info,
    content: i18n.translate('xpack.security.login.authenticationErrorDescription', {
      defaultMessage: 'An unexpected authentication error occurred. Please log in again.',
    }),
  },
  LOGGED_OUT: {
    type: LoginFormMessageType.Info,
    content: i18n.translate('xpack.security.login.loggedOutDescription', {
      defaultMessage: 'You have logged out of Elastic.',
    }),
  },
  UNAUTHENTICATED: {
    type: LoginFormMessageType.Danger,
    content: i18n.translate('xpack.security.unauthenticated.errorDescription', {
      defaultMessage:
        'Try logging in again, and if the problem persists, contact your system administrator.',
    }),
  },
};

export class LoginPage extends Component<Props, State> {
  state = { loginState: null, customBranding: {} } as State;
  private customBrandingSubscription?: Subscription;

  public async componentDidMount() {
    const loadingCount$ = new BehaviorSubject(1);
    this.customBrandingSubscription = this.props.customBranding.customBranding$.subscribe(
      (next) => {
        this.setState({ ...this.state, customBranding: next });
      }
    );
    this.props.http.addLoadingCountSource(loadingCount$.asObservable());

    try {
      this.setState({
        loginState: await this.props.http.get('/internal/security/login_state'),
      });
    } catch (err) {
      this.props.fatalErrors.add(err as Error);
    }

    loadingCount$.next(0);
    loadingCount$.complete();
  }

  public componentWillUnmount() {
    this.customBrandingSubscription?.unsubscribe();
  }

  public render() {
    const loginState = this.state.loginState;
    if (!loginState) {
      return null;
    }

    const isSecureConnection = !!window.location.protocol.match(/^https/);
    const isCookiesEnabled = window.navigator.cookieEnabled;
    const { allowLogin, layout, requiresSecureConnection } = loginState;

    const loginIsSupported =
      (requiresSecureConnection && !isSecureConnection) || !isCookiesEnabled
        ? false
        : allowLogin && layout === 'form';

    const loginWelcomeStyle = (euiTheme: EuiThemeComputed) =>
      css`
        position: relative;
        margin: auto;
        max-width: 460px;
        padding-left: ${euiTheme.size.xl};
        padding-right: ${euiTheme.size.xl};
        z-index: 10;
        text-align: center;
      `;

    const contentHeaderStyles = (euiTheme: EuiThemeComputed) => [
      loginWelcomeStyle(euiTheme),
      !loginIsSupported &&
        css`
          max-width: 700px;
        `,
    ];

    const customLogo = this.state.customBranding?.logo;
    const logo = customLogo ? (
      <EuiImage src={customLogo} size={40} alt="logo" />
    ) : isValentinesPeriod() ? (
      <HeartIcon />
    ) : (
      <EuiIcon type="logoElastic" size="xxl" />
    );
    // custom logo / heart icon needs to be centered
    const logoStyle = customLogo || isValentinesPeriod() ? { padding: 0 } : {};
    return (
      <div data-test-subj="loginForm" css={kbnFullScreenBgCss}>
        <header
          css={({ euiTheme }) => css`
            margin-top: calc(${euiTheme.size.xxl} * 3);
            position: relative;
            padding: ${euiTheme.size.base};
            z-index: 10;
          `}
        >
          <div css={({ euiTheme }) => contentHeaderStyles(euiTheme)}>
            <span className="loginWelcome__logo" style={logoStyle}>
              {logo}
            </span>
            <EuiTitle size="m" className="loginWelcome__title" data-test-subj="loginWelcomeTitle">
              <h1>
                <FormattedMessage
                  id="xpack.security.loginPage.welcomeTitle"
                  defaultMessage="Welcome to Elastic"
                />
              </h1>
            </EuiTitle>
          </div>
        </header>
        <div css={({ euiTheme }) => contentHeaderStyles(euiTheme)}>
          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem>
              {this.getLoginForm({
                ...loginState,
                isSecureConnection,
                isCookiesEnabled,
              })}
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </div>
    );
  }

  private getLoginForm = ({
    layout,
    requiresSecureConnection,
    isSecureConnection,
    isCookiesEnabled,
    selector,
    loginHelp,
  }: LoginState & {
    isSecureConnection: boolean;
    isCookiesEnabled: boolean;
  }) => {
    const isLoginExplicitlyDisabled = selector.providers.length === 0;
    if (isLoginExplicitlyDisabled) {
      return (
        <DisabledLoginForm
          title={
            <FormattedMessage
              id="xpack.security.loginPage.noLoginMethodsAvailableTitle"
              defaultMessage="Login is disabled."
            />
          }
          message={
            <FormattedMessage
              id="xpack.security.loginPage.noLoginMethodsAvailableMessage"
              defaultMessage="Contact your system administrator."
            />
          }
        />
      );
    }

    if (requiresSecureConnection && !isSecureConnection) {
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

    if (!isCookiesEnabled) {
      if (isWindowEmbedded()) {
        return (
          <div style={{ maxWidth: '36em', margin: 'auto', textAlign: 'center' }}>
            <EuiText color="subdued">
              <p>
                {this.props.sameSiteCookies !== 'None' ? (
                  <FormattedMessage
                    id="xpack.security.loginPage.openInNewWindowOrChangeKibanaConfigTitle"
                    defaultMessage="To view this content, open it in a new window or ask your administrator to allow cross-origin cookies."
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.security.loginPage.openInNewWindowOrChangeBrowserSettingsTitle"
                    defaultMessage="To view this content, open it in a new window or adjust your browser settings to allow third-party cookies."
                  />
                )}
              </p>
            </EuiText>
            <EuiSpacer />
            <EuiButton
              href={window.location.href}
              target="_blank"
              iconType="popout"
              iconSide="right"
              fill
            >
              <FormattedMessage
                id="xpack.security.loginPage.openInNewWindowButton"
                defaultMessage="Open in new window"
              />
            </EuiButton>
          </div>
        );
      }

      return (
        <DisabledLoginForm
          title={
            <FormattedMessage
              id="xpack.security.loginPage.requiresCookiesTitle"
              defaultMessage="Cookies are required to log in to Elastic"
            />
          }
          message={
            <FormattedMessage
              id="xpack.security.loginPage.requiresCookiesMessage"
              defaultMessage="Enable cookies in your browser settings to continue."
            />
          }
        />
      );
    }

    if (layout === 'error-es-unavailable') {
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
    }

    if (layout === 'error-xpack-unavailable') {
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
    }

    if (layout !== 'form') {
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
              defaultMessage="See the Kibana logs for details and try reloading the page."
            />
          }
        />
      );
    }

    const { searchParams } = new URL(window.location.href);

    return (
      <LoginForm
        http={this.props.http}
        notifications={this.props.notifications}
        selector={selector}
        message={
          loginFormMessages[searchParams.get(LOGOUT_REASON_QUERY_STRING_PARAMETER) as LogoutReason]
        }
        loginAssistanceMessage={this.props.loginAssistanceMessage}
        loginHelp={loginHelp}
        authProviderHint={searchParams.get(AUTH_PROVIDER_HINT_QUERY_STRING_PARAMETER) || undefined}
      />
    );
  };
}

export function renderLoginPage(
  services: StartServices,
  { element }: Pick<AppMountParameters, 'element'>,
  props: Props
) {
  ReactDOM.render(services.rendering.addContext(<LoginPage {...props} />), element);

  return () => ReactDOM.unmountComponentAtNode(element);
}

function isWindowEmbedded() {
  try {
    return window.self !== window.top;
  } catch (error) {
    return true;
  }
}
