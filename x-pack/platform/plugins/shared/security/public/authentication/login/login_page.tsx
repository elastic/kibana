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
    const now = new Date();
    const isValentinesSeason = now.getMonth() === 1 && now.getDate() >= 1 && now.getDate() <= 14;

    let logo;
    if (customLogo) {
      logo = <EuiImage src={customLogo} size={40} alt="logo" />;
    } else if (isValentinesSeason) {
      logo = (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 600 600"
          aria-label="Elastic Heart"
        >
          <path
            fill="#63ADAC"
            d="M397.123,463.062 C385.742,472.236 374.608,481.74 362.925,490.512 C342.72,505.683 322.175,520.399 301.43,535.557 C288.696,526.62 276.337,518.237 264.282,509.436 C215.14,473.556 168.519,434.723 126.309,390.778 C104.721,368.302 84.685,344.547 67.561,318.307 C72.239,314.141 76.662,310.33 81.04,306.467 C89.841,298.703 98.633,290.927 107.402,283.126 C125.567,266.967 143.749,250.826 161.859,234.606 C177.403,220.684 192.785,206.58 208.407,192.748 C211.919,189.639 214.836,186.625 214.605,181.805 C217.228,184.155 219.27,186.885 221.995,188.284 C229.072,191.919 236.46,194.947 243.705,198.256 C271.653,211.02 299.585,223.815 327.538,236.565 C347.038,245.459 366.562,254.299 386.22,263.464 C396.039,282.458 405.747,301.132 415.347,319.862 C416.837,322.769 417.837,325.927 419.061,329.398 C418.169,335.01 417.392,340.215 416.367,345.37 C414.017,357.185 411.451,368.957 409.15,380.78 C406.437,394.717 403.94,408.696 401.293,422.645 C399.295,433.174 396.966,443.648 395.325,454.23 C394.893,457.014 396.469,460.109 397.123,463.062z"
          />
          <path
            fill="#EFC543"
            d="M386.075,263.163 C366.562,254.299 347.038,245.459 327.538,236.565 C299.585,223.815 271.653,211.02 243.705,198.256 C236.46,194.947 229.072,191.919 221.995,188.284 C219.27,186.885 217.228,184.155 214.59,181.639 C214.304,181.247 214.108,180.973 214.108,180.663 C213.751,179.877 213.394,179.402 213.04,178.635 C212.768,177.851 212.493,177.36 212.143,176.613 C211.786,176.168 211.503,175.978 211.201,175.866 C211.182,175.944 211.281,175.817 211.301,175.493 C211.002,174.62 210.683,174.071 210.4,173.359 C210.436,173.196 210.246,172.922 210.237,172.605 C209.874,171.789 209.519,171.289 209.153,170.574 C209.142,170.359 208.95,169.973 208.943,169.699 C208.699,169.158 208.46,168.891 208.222,168.446 C208.222,168.268 208.022,167.974 208.039,167.674 C207.71,166.915 207.364,166.457 207.01,165.997 C207.003,165.997 207.009,165.982 206.993,165.699 C206.735,165.138 206.492,164.858 206.258,164.408 C206.266,164.237 206.07,163.956 206.031,163.68 C205.732,163.146 205.473,162.888 205.224,162.45 C205.235,162.27 205.058,161.956 205.039,161.671 C204.785,161.094 204.551,160.802 204.359,160.357 C204.402,160.203 204.227,159.935 204.216,159.621 C203.847,158.814 203.489,158.322 203.112,157.599 C203.093,157.369 202.886,156.957 202.889,156.711 C202.79,156.112 202.56,155.9 202.187,155.92 C202.174,156.012 202.228,155.834 202.222,155.525 C201.864,154.729 201.511,154.241 201.155,153.546 C201.151,153.34 200.966,152.97 200.961,152.696 C200.726,152.147 200.498,151.871 200.267,151.414 C200.265,151.233 200.047,150.942 200.007,150.687 C199.7,150.232 199.435,150.032 199.135,149.904 C199.101,149.977 199.216,149.865 199.227,149.545 C198.918,148.689 198.598,148.153 198.288,147.441 C198.3,147.265 198.105,146.972 198.116,146.663 C197.773,145.883 197.42,145.413 197.033,144.969 C197,144.995 197.076,144.959 197.102,144.611 C196.454,143.124 195.779,141.985 195.066,140.485 C192.297,134.27 189.566,128.414 186.878,122.162 C189.896,106.122 192.87,90.479 195.845,74.837 C205.836,78.391 216.133,81.269 225.759,85.629 C252.388,97.692 275.942,114.41 296.628,135.054 C300.058,138.476 302.015,138.351 305.429,135.016 C334.306,106.798 367.275,85.183 406.398,73.898 C439.255,64.42 471.976,63.64 503.993,77.253 C523.883,85.71 540.251,98.754 552.049,117.655 C523.031,143.561 494.095,168.899 465.129,194.203 C438.794,217.209 412.427,240.178 386.075,263.163z"
          />
          <path
            fill="#5B9FD9"
            d="M214.108,180.973 C214.108,180.973 214.304,181.247 214.32,181.413 C214.836,186.625 211.919,189.639 208.407,192.748 C192.785,206.58 177.403,220.684 161.859,234.606 C143.749,250.826 125.567,266.967 107.402,283.126 C98.633,290.927 89.841,298.703 81.04,306.467 C76.662,310.33 72.239,314.141 67.48,317.981 C47.012,288.081 30.625,256.491 26.945,220.014 C23.209,182.981 29.197,147.717 50.966,116.587 C56.701,108.387 64.561,101.674 72.023,94.401 C91.092,98.766 109.601,102.935 128.07,107.272 C141.399,110.402 154.698,113.665 167.965,117.05 C174.31,118.669 180.548,120.709 186.834,122.559 C189.566,128.414 192.297,134.27 195.037,140.835 C195.722,142.683 196.399,143.821 197.076,144.959 C197.076,144.959 197,144.995 197.009,145.286 C197.38,146.042 197.743,146.507 198.105,146.972 C198.105,146.972 198.3,147.265 198.214,147.789 C198.49,148.83 198.853,149.347 199.216,149.865 C199.216,149.865 199.101,149.977 199.161,150.168 C199.497,150.553 199.772,150.748 200.047,150.942 C200.047,150.942 200.265,151.233 200.244,151.701 C200.471,152.437 200.719,152.703 200.966,152.97 C200.966,152.97 201.151,153.34 201.108,153.884 C201.452,154.897 201.84,155.365 202.228,155.834 C202.228,155.834 202.174,156.012 202.188,156.165 C202.316,156.652 202.545,156.865 202.886,156.957 C202.886,156.957 203.093,157.369 203.074,157.935 C203.446,158.979 203.836,159.457 204.227,159.935 C204.227,159.935 204.402,160.203 204.331,160.662 C204.526,161.399 204.792,161.678 205.058,161.956 C205.058,161.956 205.235,162.27 205.226,162.747 C205.502,163.468 205.786,163.712 206.07,163.956 C206.07,163.956 206.266,164.237 206.246,164.704 C206.487,165.442 206.748,165.712 207.009,165.982 C207.009,165.982 207.003,165.997 206.998,166.303 C207.337,167.064 207.679,167.519 208.022,167.974 C208.022,167.974 208.222,168.268 208.212,168.73 C208.451,169.453 208.7,169.713 208.95,169.973 C208.95,169.973 209.142,170.359 209.108,170.914 C209.464,171.953 209.855,172.437 210.246,172.922 C210.246,172.922 210.436,173.196 210.304,173.716 C210.541,174.763 210.911,175.29 211.281,175.817 C211.281,175.817 211.182,175.944 211.228,176.149 C211.588,176.525 211.903,176.696 212.218,176.868 C212.493,177.36 212.768,177.851 213.02,178.956 C213.367,180.038 213.737,180.505 214.108,180.973z"
          />
          <path
            fill="#4374B8"
            d="M386.22,263.464 C412.427,240.178 438.794,217.209 465.129,194.203 C494.095,168.899 523.031,143.561 552.232,117.948 C564.198,134.288 570.34,153.061 573.996,172.859 C583.238,222.911 567.74,267.088 541.42,308.467 C532.335,322.75 521.781,336.099 511.23,349.936 C506.546,348.998 502.542,347.949 498.514,347.005 C479.478,342.542 460.447,338.063 441.391,333.685 C433.979,331.983 426.508,330.533 419.064,328.969 C417.837,325.927 416.837,322.769 415.347,319.862 C405.747,301.132 396.039,282.458 386.22,263.464z"
          />
          <path
            fill="#A1C351"
            d="M419.061,329.398 C426.508,330.533 433.979,331.983 441.391,333.685 C460.447,338.063 479.478,342.542 498.514,347.005 C502.542,347.949 506.546,348.998 510.966,350.135 C503.341,359.81 495.625,369.635 487.222,378.832 C461.81,406.646 434.249,432.234 405.484,456.538 C402.946,458.683 400.32,460.723 397.429,462.937 C396.469,460.109 394.893,457.014 395.325,454.23 C396.966,443.648 399.295,433.174 401.293,422.645 C403.94,408.696 406.437,394.717 409.15,380.78 C411.451,368.957 414.017,357.185 416.367,345.37 C417.392,340.215 418.169,335.01 419.061,329.398z"
          />
          <path
            fill="#D1639D"
            d="M186.878,122.162 C180.548,120.709 174.31,118.669 167.965,117.05 C154.698,113.665 141.399,110.402 128.07,107.272 C109.601,102.935 91.092,98.766 72.33,94.262 C89.679,79.281 110.263,71.79 132.797,68.958 C154.043,66.289 174.826,68.747 195.597,74.592 C192.87,90.479 189.896,106.122 186.878,122.162z"
          />
        </svg>
      );
    } else {
      logo = <EuiIcon type="logoElastic" size="xxl" />;
    }
    // custom logo needs to be centered
    const logoStyle = customLogo ? { padding: 0 } : {};
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
