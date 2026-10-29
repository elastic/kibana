/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  euiCanAnimate,
  euiCantAnimate,
  EuiFieldPassword,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  euiFocusRing,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  type UseEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ChangeEvent, FormEvent, MouseEvent } from 'react';
import React, { Component, createElement, Fragment } from 'react';
import ReactMarkdown from 'react-markdown';

import type { HttpStart, NotificationsStart } from '@kbn/core/public';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { LoginValidator } from './validate_login';
import type { LoginSelector, LoginSelectorProvider } from '../../../../../common/login_state';
import type { FormMessage } from '../../../components';
import { MessageType, renderMessage } from '../../../components';

export interface LoginFormProps {
  http: HttpStart;
  notifications: NotificationsStart;
  selector: LoginSelector;
  message?: FormMessage;
  loginAssistanceMessage: string;
  loginHelp?: string;
  authProviderHint?: string;
  /** POC: branding rendered inside the form card (logo + wordmark). */
  logo?: React.ReactNode;
}

// POC: login form entrance / exit motion phases
type MotionPhase = 'hidden' | 'visible' | 'exiting' | 'gone';

interface State {
  loadingState:
    | { type: LoadingStateType.None | LoadingStateType.Form | LoadingStateType.AutoLogin }
    | { type: LoadingStateType.Selector; providerName: string };
  username: string;
  password: string;
  message: FormMessage;
  mode: PageMode;
  previousMode: PageMode;
  motion: MotionPhase;
}

// POC: EUI "slight resistance" easing
const MOTION_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
const ENTRANCE_DELAY_MS = 400;
const ENTRANCE_DURATION_MS = 700;
const EXIT_DURATION_MS = 350;
const LOADING_HOLD_MS = 1200;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

enum LoadingStateType {
  None,
  Form,
  Selector,
  AutoLogin,
}

export enum PageMode {
  Selector,
  Form,
  LoginHelp,
}

const cardCss = (theme: UseEuiTheme, isLoading: boolean) => css`
  display: block;
  box-shadow: none;
  padding: ${theme.euiTheme.size.base};
  text-align: left;
  width: 100%;
  &:hover p[data-title] {
    text-decoration: underline;
  }
  &:disabled {
    pointer-events: none;
  }
  /* disabled + not‐loading → fade title & hint */
  ${!isLoading &&
  css`
    &:disabled p[data-title],
    &:disabled p[data-hint] {
      color: ${theme.euiTheme.colors.mediumShade};
    }
  `}
  &:focus {
    border-color: transparent;
    border-radius: ${theme.euiTheme.border.radius.medium};
    ${euiFocusRing(theme)}
    p[data-title] {
      text-decoration: underline;
    }
    + button {
      border-color: transparent;
    }
  }
  & + button {
    border-top: ${theme.euiTheme.border.thin};
  }
`;

const hintCss = (theme: UseEuiTheme) => css`
  font-size: ${theme.euiTheme.size.m};
  color: ${theme.euiTheme.colors.darkShade};
  margin-top: ${theme.euiTheme.size.xs};
`;

const assistanceCss = (theme: UseEuiTheme) => css`
  margin-top: -${theme.euiTheme.size.xl};
  padding: 0 ${theme.euiTheme.size.base};
  img {
    max-width: 100%;
  }
`;

// POC: entrance / exit motion for the login card stack
const formMotionCss = (phase: Exclude<MotionPhase, 'gone'>) => css`
  opacity: ${phase === 'visible' ? 1 : 0};
  transform: translateY(${phase === 'visible' ? 0 : 12}px);

  ${euiCanAnimate} {
    ${phase === 'visible' &&
    css`
      transition: opacity ${ENTRANCE_DURATION_MS}ms ${MOTION_EASE} ${ENTRANCE_DELAY_MS}ms,
        transform ${ENTRANCE_DURATION_MS}ms ${MOTION_EASE} ${ENTRANCE_DELAY_MS}ms;
    `}
    ${phase === 'exiting' &&
    css`
      transition: opacity ${EXIT_DURATION_MS}ms ${MOTION_EASE},
        transform ${EXIT_DURATION_MS}ms ${MOTION_EASE};
    `}
  }

  ${euiCantAnimate} {
    transform: none;
    transition: none;
    opacity: ${phase === 'hidden' || phase === 'exiting' ? 0 : 1};
  }
`;

// POC: viewport-center like boot splash (avoid flash high in the form column)
const loaderRingWrapCss = css`
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
`;

export class LoginForm extends Component<LoginFormProps, State> {
  private readonly noProvidersMessage = i18n.translate('xpack.security.noAuthProvidersForDomain', {
    defaultMessage: 'No authentication providers have been configured for this origin ({origin}).',
    values: { origin: window.location.origin },
  });

  private enterFrame: number | undefined;
  private unmounted = false;

  private readonly validator: LoginValidator;

  /**
   * Available providers that match the current origin.
   */
  private readonly availableProviders: LoginSelectorProvider[];

  /**
   * Optional provider that was suggested by the `auth_provider_hint={providerName}` query string parameter. If provider
   * doesn't require Kibana native login form then login process is triggered automatically, otherwise Login Selector
   * just switches to the Login Form mode.
   */
  private readonly suggestedProvider?: LoginSelectorProvider;

  constructor(props: LoginFormProps) {
    super(props);

    this.availableProviders = this.props.selector.providers.filter((provider) =>
      this.providerMatchesOrigin(provider)
    );

    this.validator = new LoginValidator({ shouldValidate: false });

    this.suggestedProvider = this.props.authProviderHint
      ? this.availableProviders.find(({ name }) => name === this.props.authProviderHint)
      : undefined;

    // Switch to the Form mode right away if provider from the hint requires it.
    const mode =
      this.showLoginSelector() && !this.suggestedProvider?.usesLoginForm
        ? PageMode.Selector
        : PageMode.Form;

    this.state = {
      loadingState: { type: LoadingStateType.None },
      username: '',
      password: '',
      message:
        this.props.message ??
        (this.availableProviders.length === 0
          ? {
              type: MessageType.Danger,
              content: this.noProvidersMessage,
            }
          : { type: MessageType.None }),
      mode,
      previousMode: mode,
      motion: 'hidden',
    };
  }

  async componentDidMount() {
    // POC: kick off entrance after first paint so the transition runs
    this.enterFrame = window.requestAnimationFrame(() => {
      if (!this.unmounted) {
        this.setState({ motion: 'visible' });
      }
    });

    if (this.suggestedProvider?.usesLoginForm === false) {
      await this.loginWithSelector({ provider: this.suggestedProvider, autoLogin: true });
    }
  }

  componentWillUnmount() {
    this.unmounted = true;
    if (this.enterFrame !== undefined) {
      window.cancelAnimationFrame(this.enterFrame);
    }
  }

  public render() {
    if (this.isLoadingState(LoadingStateType.AutoLogin)) {
      return this.renderAutoLoginOverlay();
    }

    if (this.state.motion === 'gone') {
      return this.renderLoaderRing();
    }

    return (
      <div css={formMotionCss(this.state.motion)}>
        {this.renderLoginAssistanceMessage()}
        {this.renderContent()}
        {/* POC: message below the card so clearing it on submit doesn't shift the form */}
        {this.state.message.type !== MessageType.None && this.state.message.content && (
          <EuiSpacer size="l" />
        )}
        {renderMessage(this.state.message)}
        {this.renderPageModeSwitchLink()}
      </div>
    );
  }

  private renderLoaderRing = () => {
    // POC: reuse boot-splash CE already registered via /ui/loader_ring.js
    return (
      <div css={loaderRingWrapCss} data-test-subj="loginLoaderRing">
        {createElement('elastic-loader-ring', {
          mode: 'sweep',
          size: '120',
          thickness: '5',
        })}
      </div>
    );
  };

  private renderLoginAssistanceMessage = () => {
    if (!this.props.loginAssistanceMessage) {
      return null;
    }

    return (
      <div data-test-subj="loginAssistanceMessage" css={(theme) => assistanceCss(theme)}>
        <EuiHorizontalRule size="half" />
        <EuiText size="xs">
          <ReactMarkdown>{this.props.loginAssistanceMessage}</ReactMarkdown>
        </EuiText>
      </div>
    );
  };

  public renderContent() {
    if (this.availableProviders.length === 0) {
      return;
    }

    switch (this.state.mode) {
      case PageMode.Form:
        return this.renderLoginForm();
      case PageMode.Selector:
        return this.renderSelector();
      case PageMode.LoginHelp:
        return this.renderLoginHelp();
    }
  }

  private renderLoginForm = () => {
    const loginSelectorLink = this.showLoginSelector() ? (
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          data-test-subj="loginBackToSelector"
          size="xs"
          onClick={() => this.onPageModeChange(PageMode.Selector)}
        >
          <FormattedMessage
            id="xpack.security.loginPage.loginSelectorLinkText"
            defaultMessage="More login options"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
    ) : null;

    return (
      <EuiPanel
        data-test-subj="loginForm"
        color="plain"
        paddingSize="l"
        hasShadow
        hasBorder={false}
      >
        {this.props.logo}
        {this.props.logo && <EuiSpacer size="xl" />}
        <form onSubmit={this.submitLoginForm}>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.security.login.basicLoginForm.usernameFormRowLabel"
                defaultMessage="Username"
              />
            }
            {...this.validator.validateUsername(this.state.username)}
          >
            <EuiFieldText
              autoComplete="off"
              id="username"
              name="username"
              data-test-subj="loginUsername"
              value={this.state.username}
              onChange={this.onUsernameChange}
              disabled={!this.isLoadingState(LoadingStateType.None)}
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
            {...this.validator.validatePassword(this.state.password)}
          >
            <EuiFieldPassword
              autoComplete="off"
              id="password"
              name="password"
              data-test-subj="loginPassword"
              type={'dual'}
              value={this.state.password}
              onChange={this.onPasswordChange}
              disabled={!this.isLoadingState(LoadingStateType.None)}
              isInvalid={false}
              aria-required={true}
            />
          </EuiFormRow>

          <EuiSpacer size="l" />

          <EuiFlexGroup responsive={false} alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                minWidth={120}
                type="submit"
                color="primary"
                onClick={this.submitLoginForm}
                isDisabled={!this.isLoadingState(LoadingStateType.None)}
                isLoading={this.isLoadingState(LoadingStateType.Form)}
                data-test-subj="loginSubmit"
              >
                <FormattedMessage
                  id="xpack.security.login.basicLoginForm.logInButtonLabel"
                  defaultMessage="Log in"
                />
              </EuiButton>
            </EuiFlexItem>
            {loginSelectorLink}
          </EuiFlexGroup>
        </form>
      </EuiPanel>
    );
  };

  private renderSelector = () => {
    const providers = this.availableProviders.filter((p) => p.showInSelector);

    return (
      <EuiPanel data-test-subj="loginSelector" paddingSize="none">
        {providers.map((provider) => {
          const loading = this.isLoadingState(LoadingStateType.Selector, provider.name);

          return (
            <button
              key={provider.name}
              data-test-subj={`loginCard-${provider.type}/${provider.name}`}
              disabled={!this.isLoadingState(LoadingStateType.None)}
              onClick={() =>
                provider.usesLoginForm
                  ? this.onPageModeChange(PageMode.Form)
                  : this.loginWithSelector({ provider })
              }
              css={(theme) => cardCss(theme, loading)}
            >
              <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon size="xl" type={provider.icon ?? 'empty'} aria-hidden={true} />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiTitle size="xs">
                    <p data-title data-test-subj="card-title">
                      {provider.description ?? (
                        <FormattedMessage
                          id="xpack.security.loginPage.loginProviderDescription"
                          defaultMessage="Log in with {providerType}/{providerName}"
                          values={{
                            providerType: provider.type,
                            providerName: provider.name,
                          }}
                        />
                      )}
                    </p>
                  </EuiTitle>
                  {provider.hint && (
                    <p data-hint data-test-subj="card-hint" css={(theme) => hintCss(theme)}>
                      {provider.hint}
                    </p>
                  )}
                </EuiFlexItem>
                {loading && (
                  <EuiFlexItem grow={false}>
                    <EuiLoadingSpinner size="m" />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </button>
          );
        })}
      </EuiPanel>
    );
  };

  private renderLoginHelp = () => {
    return (
      <EuiPanel data-test-subj="loginHelp">
        <EuiText>
          <ReactMarkdown>{this.props.loginHelp || ''}</ReactMarkdown>
        </EuiText>
      </EuiPanel>
    );
  };

  private renderPageModeSwitchLink = () => {
    if (this.state.mode === PageMode.LoginHelp) {
      return (
        <Fragment>
          <EuiSpacer />
          <EuiText size="xs" className="eui-textCenter">
            <EuiLink
              data-test-subj="loginBackToLoginLink"
              onClick={() => this.onPageModeChange(this.state.previousMode)}
            >
              <FormattedMessage
                id="xpack.security.loginPage.goBackToLoginLink"
                defaultMessage="Take me back to Login"
              />
            </EuiLink>
          </EuiText>
        </Fragment>
      );
    }

    if (this.props.loginHelp) {
      return (
        <Fragment>
          <EuiSpacer />
          <EuiText size="xs" className="eui-textCenter">
            <EuiLink
              data-test-subj="loginHelpLink"
              onClick={() => this.onPageModeChange(PageMode.LoginHelp)}
            >
              <FormattedMessage
                id="xpack.security.loginPage.loginHelpLinkText"
                defaultMessage="Need help?"
              />
            </EuiLink>
          </EuiText>
        </Fragment>
      );
    }

    return null;
  };

  private renderAutoLoginOverlay = () => {
    return (
      <EuiFlexGroup
        data-test-subj="autoLoginOverlay"
        alignItems="center"
        justifyContent="center"
        gutterSize="m"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="l" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="m" className="eui-textCenter">
            <FormattedMessage
              id="xpack.security.loginPage.autoLoginAuthenticatingLabel"
              defaultMessage="Authenticating…"
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  private setUsernameInputRef(ref: HTMLInputElement) {
    if (ref) {
      ref.focus();
    }
  }

  private onPageModeChange = (mode: PageMode) => {
    this.setState({ message: { type: MessageType.None }, mode, previousMode: this.state.mode });
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

  private submitLoginForm = async (
    e: MouseEvent<HTMLButtonElement> | FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    this.validator.enableValidation();

    const { username, password } = this.state;
    if (this.validator.validateForLogin(username, password).isInvalid) {
      // Since validation is enabled now, we should ask React to re-render form and display
      // validation error messages if any.
      return this.forceUpdate();
    }

    this.setState({
      loadingState: { type: LoadingStateType.Form },
      message: { type: MessageType.None },
    });

    // We try to log in with the provider that uses login form and has the lowest order.
    const providerToLoginWith = this.availableProviders.find((provider) => provider.usesLoginForm)!;

    // POC: hold button loading ≥ LOADING_HOLD_MS on success, then exit → loader ring
    const loginPromise = this.props.http.post<{ location: string }>(
      '/internal/security/login',
      {
        body: JSON.stringify({
          providerType: providerToLoginWith.type,
          providerName: providerToLoginWith.name,
          currentURL: window.location.href,
          params: { username, password },
        }),
      }
    );

    try {
      const [{ location }] = await Promise.all([loginPromise, wait(LOADING_HOLD_MS)]);
      if (this.unmounted) {
        return;
      }

      if (prefersReducedMotion()) {
        this.setState({ motion: 'gone' });
        window.location.href = location;
        return;
      }

      this.setState({ motion: 'exiting' });
      await wait(EXIT_DURATION_MS);
      if (this.unmounted) {
        return;
      }

      this.setState({ motion: 'gone' });
      // Paint the loader ring before navigating into the boot splash
      window.requestAnimationFrame(() => {
        window.location.href = location;
      });
    } catch (error) {
      if (this.unmounted) {
        return;
      }

      const message =
        (error as IHttpFetchError).response?.status === 401
          ? i18n.translate(
              'xpack.security.login.basicLoginForm.usernameOrPasswordIsIncorrectErrorMessage',
              { defaultMessage: 'Username or password is incorrect. Please try again.' }
            )
          : i18n.translate('xpack.security.login.basicLoginForm.unknownErrorMessage', {
              defaultMessage: `We couldn't log you in. Please try again.`,
            });

      this.setState({
        message: { type: MessageType.Danger, content: message },
        loadingState: { type: LoadingStateType.None },
        motion: 'visible',
      });
    }
  };

  private loginWithSelector = async ({
    provider: { type: providerType, name: providerName },
    autoLogin,
  }: {
    provider: LoginSelectorProvider;
    autoLogin?: boolean;
  }) => {
    this.setState({
      loadingState: autoLogin
        ? { type: LoadingStateType.AutoLogin }
        : { type: LoadingStateType.Selector, providerName },
      message: { type: MessageType.None },
    });

    try {
      const { location } = await this.props.http.post<{ location: string }>(
        '/internal/security/login',
        { body: JSON.stringify({ providerType, providerName, currentURL: window.location.href }) }
      );

      window.location.href = location;
    } catch (err: any) {
      this.props.notifications.toasts.addError(
        err?.body?.message ? new Error(err?.body?.message) : err,
        {
          title: i18n.translate('xpack.security.loginPage.loginSelectorErrorMessage', {
            defaultMessage: 'Could not perform login.',
          }),
          toastMessage: err?.message,
        }
      );

      this.setState({ loadingState: { type: LoadingStateType.None } });
    }
  };

  private isLoadingState(
    type: LoadingStateType.None | LoadingStateType.Form | LoadingStateType.AutoLogin
  ): boolean;
  private isLoadingState(type: LoadingStateType.Selector, providerName: string): boolean;
  private isLoadingState(type: LoadingStateType, providerName?: string) {
    const { loadingState } = this.state;
    if (loadingState.type !== type) {
      return false;
    }

    return (
      loadingState.type !== LoadingStateType.Selector || loadingState.providerName === providerName
    );
  }

  private showLoginSelector() {
    return (
      this.props.selector.enabled &&
      this.availableProviders.some((provider) => !provider.usesLoginForm && provider.showInSelector)
    );
  }

  private providerMatchesOrigin(provider: LoginSelectorProvider): boolean {
    const { origin } = window.location;
    return (
      !provider.origin ||
      (Array.isArray(provider.origin)
        ? provider.origin.includes(origin)
        : provider.origin === origin)
    );
  }
}
