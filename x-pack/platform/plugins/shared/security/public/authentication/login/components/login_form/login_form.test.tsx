/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';

import { coreMock } from '@kbn/core/public/mocks';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n-react';

import { LoginForm, PageMode } from './login_form';
import { MessageType } from '../../../components';

function getPageModeAssertions(mode: PageMode): Array<[string, boolean]> {
  return mode === PageMode.Form
    ? [
        ['loginForm', true],
        ['loginSelector', false],
        ['loginHelp', false],
        ['autoLoginOverlay', false],
      ]
    : mode === PageMode.Selector
    ? [
        ['loginForm', false],
        ['loginSelector', true],
        ['loginHelp', false],
        ['autoLoginOverlay', false],
      ]
    : [
        ['loginForm', false],
        ['loginSelector', false],
        ['loginHelp', true],
        ['autoLoginOverlay', false],
      ];
}

function expectPageMode(mode: PageMode) {
  for (const [selector, exists] of getPageModeAssertions(mode)) {
    expect(!!screen.queryByTestId(selector)).toBe(exists);
  }
}

function expectAutoLoginOverlay() {
  for (const selector of [
    'loginForm',
    'loginSelector',
    'loginHelp',
    'loginHelpLink',
    'loginAssistanceMessage',
  ]) {
    expect(screen.queryByTestId(selector)).not.toBeInTheDocument();
  }
  expect(screen.getByTestId('autoLoginOverlay')).toBeInTheDocument();
}

describe('LoginForm', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      value: { href: 'https://some-host/bar' },
      writable: true,
    });
  });

  it('renders as expected', () => {
    const coreStartMock = coreMock.createStart();
    const { container } = render(
      <I18nProvider>
        <EuiProvider>
          <LoginForm
            http={coreStartMock.http}
            notifications={coreStartMock.notifications}
            loginAssistanceMessage=""
            selector={{
              enabled: false,
              providers: [
                { type: 'basic', name: 'basic', usesLoginForm: true, showInSelector: true },
              ],
            }}
          />
        </EuiProvider>
      </I18nProvider>
    );

    expect(container.children[0]).toMatchSnapshot();
  });

  it('renders an info message when provided.', () => {
    const coreStartMock = coreMock.createStart();
    render(
      <I18nProvider>
        <EuiProvider>
          <LoginForm
            http={coreStartMock.http}
            notifications={coreStartMock.notifications}
            message={{ type: MessageType.Info, content: 'Hey this is an info message' }}
            loginAssistanceMessage=""
            selector={{
              enabled: false,
              providers: [
                { type: 'basic', name: 'basic', usesLoginForm: true, showInSelector: true },
              ],
            }}
          />
        </EuiProvider>
      </I18nProvider>
    );

    expectPageMode(PageMode.Form);

    expect(screen.getByTestId('loginInfoMessage')).toHaveTextContent('Hey this is an info message');
  });

  it('renders `Need help?` link if login help text is provided.', () => {
    const coreStartMock = coreMock.createStart();
    render(
      <I18nProvider>
        <EuiProvider>
          <LoginForm
            http={coreStartMock.http}
            notifications={coreStartMock.notifications}
            loginHelp={'**Hey this is a login help message**'}
            loginAssistanceMessage=""
            selector={{
              enabled: false,
              providers: [
                { type: 'basic', name: 'basic', usesLoginForm: true, showInSelector: true },
              ],
            }}
          />
        </EuiProvider>
      </I18nProvider>
    );

    expectPageMode(PageMode.Form);

    expect(screen.getByTestId('loginHelpLink')).toHaveTextContent('Need help?');
  });

  it('renders an invalid credentials message', async () => {
    const coreStartMock = coreMock.createStart({ basePath: '/some-base-path' });
    coreStartMock.http.post.mockRejectedValue({ response: { status: 401 } });

    render(
      <I18nProvider>
        <EuiProvider>
          <LoginForm
            http={coreStartMock.http}
            notifications={coreStartMock.notifications}
            loginAssistanceMessage=""
            selector={{
              enabled: false,
              providers: [
                { type: 'basic', name: 'basic', usesLoginForm: true, showInSelector: true },
              ],
            }}
          />
        </EuiProvider>
      </I18nProvider>
    );

    expectPageMode(PageMode.Form);

    fireEvent.change(document.querySelector('input[name="username"]')!, {
      target: { value: 'username' },
    });
    fireEvent.change(document.querySelector('input[name="password"]')!, {
      target: { value: 'password' },
    });
    fireEvent.click(screen.getByTestId('loginSubmit'));

    expect(await screen.findByTestId('loginErrorMessage')).toHaveTextContent(
      'Username or password is incorrect. Please try again.'
    );
  });

  it('renders unknown error message', async () => {
    const coreStartMock = coreMock.createStart({ basePath: '/some-base-path' });
    coreStartMock.http.post.mockRejectedValue({ response: { status: 500 } });

    render(
      <I18nProvider>
        <EuiProvider>
          <LoginForm
            http={coreStartMock.http}
            notifications={coreStartMock.notifications}
            loginAssistanceMessage=""
            selector={{
              enabled: false,
              providers: [
                { type: 'basic', name: 'basic', usesLoginForm: true, showInSelector: true },
              ],
            }}
          />
        </EuiProvider>
      </I18nProvider>
    );

    expectPageMode(PageMode.Form);

    fireEvent.change(document.querySelector('input[name="username"]')!, {
      target: { value: 'username' },
    });
    fireEvent.change(document.querySelector('input[name="password"]')!, {
      target: { value: 'password' },
    });
    fireEvent.click(screen.getByTestId('loginSubmit'));

    expect(await screen.findByTestId('loginErrorMessage')).toHaveTextContent(
      `We couldn't log you in. Please try again.`
    );
  });

  it('properly redirects after successful login', async () => {
    window.location.href = `https://some-host/login?next=${encodeURIComponent(
      '/some-base-path/app/home#/?_g=()'
    )}`;
    const coreStartMock = coreMock.createStart({ basePath: '/some-base-path' });
    coreStartMock.http.post.mockResolvedValue({ location: '/some-base-path/app/home#/?_g=()' });

    render(
      <I18nProvider>
        <EuiProvider>
          <LoginForm
            http={coreStartMock.http}
            notifications={coreStartMock.notifications}
            loginAssistanceMessage=""
            selector={{
              enabled: false,
              providers: [
                { type: 'basic', name: 'basic1', usesLoginForm: true, showInSelector: true },
              ],
            }}
          />
        </EuiProvider>
      </I18nProvider>
    );

    expectPageMode(PageMode.Form);

    fireEvent.change(document.querySelector('input[name="username"]')!, {
      target: { value: 'username1' },
    });
    fireEvent.change(document.querySelector('input[name="password"]')!, {
      target: { value: 'password1' },
    });
    fireEvent.click(screen.getByTestId('loginSubmit'));

    await waitFor(() => expect(window.location.href).toBe('/some-base-path/app/home#/?_g=()'));

    expect(coreStartMock.http.post).toHaveBeenCalledTimes(1);
    expect(coreStartMock.http.post).toHaveBeenCalledWith('/internal/security/login', {
      body: JSON.stringify({
        providerType: 'basic',
        providerName: 'basic1',
        currentURL: `https://some-host/login?next=${encodeURIComponent(
          '/some-base-path/app/home#/?_g=()'
        )}`,
        params: { username: 'username1', password: 'password1' },
      }),
    });

    expect(screen.queryByTestId('loginErrorMessage')).not.toBeInTheDocument();
  });

  it('properly switches to login help', async () => {
    const coreStartMock = coreMock.createStart({ basePath: '/some-base-path' });
    render(
      <I18nProvider>
        <EuiProvider>
          <LoginForm
            http={coreStartMock.http}
            notifications={coreStartMock.notifications}
            loginAssistanceMessage=""
            loginHelp="**some help**"
            selector={{
              enabled: false,
              providers: [
                { type: 'basic', name: 'basic', usesLoginForm: true, showInSelector: true },
              ],
            }}
          />
        </EuiProvider>
      </I18nProvider>
    );

    expectPageMode(PageMode.Form);
    expect(screen.queryByTestId('loginBackToSelector')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('loginHelpLink'));
    expectPageMode(PageMode.LoginHelp);

    expect(screen.getByTestId('loginHelp')).toMatchSnapshot('Login Help');

    fireEvent.click(screen.getByTestId('loginBackToLoginLink'));
    expectPageMode(PageMode.Form);
    expect(screen.queryByTestId('loginBackToSelector')).not.toBeInTheDocument();
  });

  describe('login selector', () => {
    it('renders as expected with providers that use login form', async () => {
      const coreStartMock = coreMock.createStart();
      render(
        <I18nProvider>
          <EuiProvider>
            <LoginForm
              http={coreStartMock.http}
              notifications={coreStartMock.notifications}
              loginAssistanceMessage=""
              selector={{
                enabled: true,
                providers: [
                  {
                    type: 'basic',
                    name: 'basic',
                    usesLoginForm: true,
                    hint: 'Basic hint',
                    icon: 'logoElastic',
                    showInSelector: true,
                  },
                  {
                    type: 'saml',
                    name: 'saml1',
                    description: 'Log in w/SAML',
                    usesLoginForm: false,
                    showInSelector: true,
                  },
                  {
                    type: 'pki',
                    name: 'pki1',
                    description: 'Log in w/PKI',
                    hint: 'PKI hint',
                    usesLoginForm: false,
                    showInSelector: true,
                  },
                ],
              }}
            />
          </EuiProvider>
        </I18nProvider>
      );

      expectPageMode(PageMode.Selector);

      const cards = screen.queryAllByTestId(/^loginCard-/);
      const result = cards.map((card) => {
        const hint = within(card).queryByTestId('card-hint');
        const title = within(card).getByTestId('card-title');
        const icon = card.querySelector('[data-euiicon-type]');
        return {
          title: title.textContent ?? '',
          hint: hint?.textContent ?? '',
          icon: icon?.getAttribute('data-euiicon-type') ?? 'empty',
        };
      });

      expect(result).toEqual([
        { title: 'Log in with basic/basic', hint: 'Basic hint', icon: 'logoElastic' },
        { title: 'Log in w/SAML', hint: '', icon: 'empty' },
        { title: 'Log in w/PKI', hint: 'PKI hint', icon: 'empty' },
      ]);
    });

    it('renders as expected without providers that use login form', async () => {
      const coreStartMock = coreMock.createStart();
      render(
        <I18nProvider>
          <EuiProvider>
            <LoginForm
              http={coreStartMock.http}
              notifications={coreStartMock.notifications}
              loginAssistanceMessage=""
              selector={{
                enabled: true,
                providers: [
                  {
                    type: 'saml',
                    name: 'saml1',
                    description: 'Login w/SAML',
                    hint: 'SAML hint',
                    usesLoginForm: false,
                    showInSelector: true,
                  },
                  {
                    type: 'pki',
                    name: 'pki1',
                    icon: 'some-icon',
                    usesLoginForm: false,
                    showInSelector: true,
                  },
                ],
              }}
            />
          </EuiProvider>
        </I18nProvider>
      );

      expectPageMode(PageMode.Selector);
      const cards = screen.queryAllByTestId(/^loginCard-/);
      const result = cards.map((card) => {
        const hint = within(card).queryByTestId('card-hint');
        const title = within(card).getByTestId('card-title');
        const icon = card.querySelector('[data-euiicon-type]');
        return {
          title: title.textContent ?? '',
          hint: hint?.textContent ?? '',
          icon: icon?.getAttribute('data-euiicon-type') ?? 'empty',
        };
      });
      expect(result).toEqual([
        { title: 'Login w/SAML', hint: 'SAML hint', icon: 'empty' },
        { title: 'Log in with pki/pki1', hint: '', icon: 'some-icon' },
      ]);
    });

    it('does not render providers with origin configs that do not match current page', async () => {
      const currentURL = `https://some-host.com/login?next=${encodeURIComponent(
        '/some-base-path/app/kibana#/home?_g=()'
      )}`;

      const coreStartMock = coreMock.createStart({ basePath: '/some-base-path' });

      // @ts-expect-error upgrade typescript v5.9.3
      window.location = { ...window.location, href: currentURL, origin: 'https://some-host.com' };
      render(
        <I18nProvider>
          <EuiProvider>
            <LoginForm
              http={coreStartMock.http}
              notifications={coreStartMock.notifications}
              loginAssistanceMessage=""
              selector={{
                enabled: true,
                providers: [
                  {
                    type: 'basic',
                    name: 'basic',
                    usesLoginForm: true,
                    hint: 'Basic hint',
                    icon: 'logoElastic',
                    showInSelector: true,
                  },
                  {
                    type: 'saml',
                    name: 'saml1',
                    description: 'Log in w/SAML',
                    origin: ['https://some-host.com', 'https://some-other-host.com'],
                    usesLoginForm: false,
                    showInSelector: true,
                  },
                  {
                    type: 'pki',
                    name: 'pki1',
                    description: 'Log in w/PKI',
                    hint: 'PKI hint',
                    origin: 'https://not-some-host.com',
                    usesLoginForm: false,
                    showInSelector: true,
                  },
                ],
              }}
            />
          </EuiProvider>
        </I18nProvider>
      );

      expect(window.location.origin).toBe('https://some-host.com');

      expectPageMode(PageMode.Selector);

      const cards = screen.queryAllByTestId(/^loginCard-/);
      const result = cards.map((card) => {
        const hint = within(card).queryByTestId('card-hint');
        const title = within(card).getByTestId('card-title');
        const icon = card.querySelector('[data-euiicon-type]');
        return {
          title: title?.textContent ?? '',
          hint: hint?.textContent ?? '',
          icon: icon?.getAttribute('data-euiicon-type') ?? null,
        };
      });

      expect(result).toEqual([
        { title: 'Log in with basic/basic', hint: 'Basic hint', icon: 'logoElastic' },
        { title: 'Log in w/SAML', hint: '', icon: 'empty' },
      ]);
    });

    it('does not render any providers and shows error message if no providers match current origin', async () => {
      const currentURL = `https://some-host.com/login?next=${encodeURIComponent(
        '/some-base-path/app/kibana#/home?_g=()'
      )}`;

      // @ts-expect-error upgrade typescript v5.9.3
      window.location = {
        ...window.location,
        href: currentURL,
        origin: 'https://some-host.com',
      };

      const coreStartMock = coreMock.createStart({
        basePath: '/some-base-path',
      });

      render(
        <I18nProvider>
          <EuiProvider>
            <LoginForm
              http={coreStartMock.http}
              notifications={coreStartMock.notifications}
              loginAssistanceMessage=""
              selector={{
                enabled: true,
                providers: [
                  {
                    type: 'basic',
                    name: 'basic',
                    usesLoginForm: true,
                    hint: 'Basic hint',
                    icon: 'logoElastic',
                    origin: 'https://not-some-host.com',
                    showInSelector: true,
                  },
                  {
                    type: 'saml',
                    name: 'saml1',
                    description: 'Log in w/SAML',
                    origin: ['https://not-some-host.com', 'https://not-some-other-host.com'],
                    usesLoginForm: false,
                    showInSelector: true,
                  },
                  {
                    type: 'pki',
                    name: 'pki1',
                    description: 'Log in w/PKI',
                    hint: 'PKI hint',
                    origin: 'https://not-some-host.com',
                    usesLoginForm: false,
                    showInSelector: true,
                  },
                ],
              }}
            />
          </EuiProvider>
        </I18nProvider>
      );

      expect(window.location.origin).toBe('https://some-host.com');

      expect(screen.queryByTestId('loginForm')).not.toBeInTheDocument();
      expect(screen.queryByTestId('loginSelector')).not.toBeInTheDocument();
      expect(screen.queryByTestId('loginHelp')).not.toBeInTheDocument();
      expect(screen.queryByTestId('autoLoginOverlay')).not.toBeInTheDocument();
      expect(screen.queryAllByTestId(/^loginCard-/).length).toBe(0);

      expect(screen.getByTestId('loginErrorMessage')).toHaveTextContent(
        i18n.translate('xpack.security.noAuthProvidersForDomain', {
          defaultMessage:
            'No authentication providers have been configured for this origin (https://some-host.com).',
        })
      );
    });

    it('properly redirects after successful login', async () => {
      const currentURL = `https://some-host/login?next=${encodeURIComponent(
        '/some-base-path/app/kibana#/home?_g=()'
      )}`;

      const coreStartMock = coreMock.createStart({ basePath: '/some-base-path' });
      coreStartMock.http.post.mockResolvedValue({
        location: 'https://external-idp/login?optional-arg=2#optional-hash',
      });

      window.location.href = currentURL;
      render(
        <I18nProvider>
          <EuiProvider>
            <LoginForm
              http={coreStartMock.http}
              notifications={coreStartMock.notifications}
              loginAssistanceMessage=""
              selector={{
                enabled: true,
                providers: [
                  { type: 'basic', name: 'basic', usesLoginForm: true, showInSelector: true },
                  {
                    type: 'saml',
                    name: 'saml1',
                    description: 'Login w/SAML',
                    usesLoginForm: false,
                    showInSelector: true,
                  },
                  {
                    type: 'pki',
                    name: 'pki1',
                    description: 'Login w/PKI',
                    usesLoginForm: false,
                    showInSelector: true,
                  },
                ],
              }}
            />
          </EuiProvider>
        </I18nProvider>
      );

      expectPageMode(PageMode.Selector);

      fireEvent.click(screen.getByTestId('loginCard-saml/saml1'));

      await waitFor(() =>
        expect(window.location.href).toBe('https://external-idp/login?optional-arg=2#optional-hash')
      );

      expect(coreStartMock.http.post).toHaveBeenCalledTimes(1);
      expect(coreStartMock.http.post).toHaveBeenCalledWith('/internal/security/login', {
        body: JSON.stringify({ providerType: 'saml', providerName: 'saml1', currentURL }),
      });

      expect(screen.queryByTestId('loginErrorMessage')).not.toBeInTheDocument();
      expect(coreStartMock.notifications.toasts.addError).not.toHaveBeenCalled();
    });

    it('shows error toast if login fails', async () => {
      const currentURL = `https://some-host/login?next=${encodeURIComponent(
        '/some-base-path/app/kibana#/home?_g=()'
      )}`;

      const failureReason = new Error('Oh no!');
      const coreStartMock = coreMock.createStart({ basePath: '/some-base-path' });
      coreStartMock.http.post.mockRejectedValue(failureReason);

      window.location.href = currentURL;
      render(
        <I18nProvider>
          <EuiProvider>
            <LoginForm
              http={coreStartMock.http}
              notifications={coreStartMock.notifications}
              loginAssistanceMessage=""
              selector={{
                enabled: true,
                providers: [
                  { type: 'basic', name: 'basic', usesLoginForm: true, showInSelector: true },
                  { type: 'saml', name: 'saml1', usesLoginForm: false, showInSelector: true },
                ],
              }}
            />
          </EuiProvider>
        </I18nProvider>
      );

      expectPageMode(PageMode.Selector);

      fireEvent.click(screen.getByTestId('loginCard-saml/saml1'));

      await waitFor(() =>
        expect(coreStartMock.notifications.toasts.addError).toHaveBeenCalledWith(failureReason, {
          title: 'Could not perform login.',
          toastMessage: 'Oh no!',
        })
      );

      expect(coreStartMock.http.post).toHaveBeenCalledTimes(1);
      expect(coreStartMock.http.post).toHaveBeenCalledWith('/internal/security/login', {
        body: JSON.stringify({ providerType: 'saml', providerName: 'saml1', currentURL }),
      });

      expect(window.location.href).toBe(currentURL);
    });

    it('shows error with message in the `body`', async () => {
      const currentURL = `https://some-host/login?next=${encodeURIComponent(
        '/some-base-path/app/kibana#/home?_g=()'
      )}`;

      const coreStartMock = coreMock.createStart({ basePath: '/some-base-path' });
      coreStartMock.http.post.mockRejectedValue({
        body: { message: 'Oh no! But with much more details!' },
        message: 'Oh no!',
      });

      window.location.href = currentURL;
      render(
        <I18nProvider>
          <EuiProvider>
            <LoginForm
              http={coreStartMock.http}
              notifications={coreStartMock.notifications}
              loginAssistanceMessage=""
              selector={{
                enabled: true,
                providers: [
                  { type: 'basic', name: 'basic', usesLoginForm: true, showInSelector: true },
                  { type: 'saml', name: 'saml1', usesLoginForm: false, showInSelector: true },
                ],
              }}
            />
          </EuiProvider>
        </I18nProvider>
      );

      expectPageMode(PageMode.Selector);

      fireEvent.click(screen.getByTestId('loginCard-saml/saml1'));

      await waitFor(() =>
        expect(coreStartMock.notifications.toasts.addError).toHaveBeenCalledWith(
          new Error('Oh no! But with much more details!'),
          { title: 'Could not perform login.', toastMessage: 'Oh no!' }
        )
      );

      expect(coreStartMock.http.post).toHaveBeenCalledTimes(1);
      expect(coreStartMock.http.post).toHaveBeenCalledWith('/internal/security/login', {
        body: JSON.stringify({ providerType: 'saml', providerName: 'saml1', currentURL }),
      });

      expect(window.location.href).toBe(currentURL);
    });

    it('properly switches to login form', async () => {
      const currentURL = `https://some-host/login?next=${encodeURIComponent(
        '/some-base-path/app/kibana#/home?_g=()'
      )}`;

      const coreStartMock = coreMock.createStart({ basePath: '/some-base-path' });
      window.location.href = currentURL;
      render(
        <I18nProvider>
          <EuiProvider>
            <LoginForm
              http={coreStartMock.http}
              notifications={coreStartMock.notifications}
              loginAssistanceMessage=""
              selector={{
                enabled: true,
                providers: [
                  { type: 'basic', name: 'basic', usesLoginForm: true, showInSelector: true },
                  { type: 'saml', name: 'saml1', usesLoginForm: false, showInSelector: true },
                ],
              }}
            />
          </EuiProvider>
        </I18nProvider>
      );

      expectPageMode(PageMode.Selector);

      fireEvent.click(screen.getByTestId('loginCard-basic/basic'));
      expectPageMode(PageMode.Form);

      expect(coreStartMock.http.post).not.toHaveBeenCalled();
      expect(coreStartMock.notifications.toasts.addError).not.toHaveBeenCalled();
      expect(window.location.href).toBe(currentURL);
    });

    it('properly switches to login help', async () => {
      const coreStartMock = coreMock.createStart({ basePath: '/some-base-path' });
      render(
        <I18nProvider>
          <EuiProvider>
            <LoginForm
              http={coreStartMock.http}
              notifications={coreStartMock.notifications}
              loginAssistanceMessage=""
              loginHelp="**some help**"
              selector={{
                enabled: true,
                providers: [
                  { type: 'basic', name: 'basic', usesLoginForm: true, showInSelector: true },
                  { type: 'saml', name: 'saml1', usesLoginForm: false, showInSelector: true },
                ],
              }}
            />
          </EuiProvider>
        </I18nProvider>
      );

      expectPageMode(PageMode.Selector);

      fireEvent.click(screen.getByTestId('loginHelpLink'));
      expectPageMode(PageMode.LoginHelp);

      expect(screen.getByTestId('loginHelp')).toMatchSnapshot('Login Help');

      fireEvent.click(screen.getByTestId('loginBackToLoginLink'));
      expectPageMode(PageMode.Selector);

      expect(coreStartMock.http.post).not.toHaveBeenCalled();
      expect(coreStartMock.notifications.toasts.addError).not.toHaveBeenCalled();
    });

    it('properly switches to login form -> login help and back', async () => {
      const coreStartMock = coreMock.createStart({ basePath: '/some-base-path' });
      render(
        <I18nProvider>
          <EuiProvider>
            <LoginForm
              http={coreStartMock.http}
              notifications={coreStartMock.notifications}
              loginAssistanceMessage=""
              loginHelp="**some help**"
              selector={{
                enabled: true,
                providers: [
                  { type: 'basic', name: 'basic', usesLoginForm: true, showInSelector: true },
                  { type: 'saml', name: 'saml1', usesLoginForm: false, showInSelector: true },
                ],
              }}
            />
          </EuiProvider>
        </I18nProvider>
      );

      expectPageMode(PageMode.Selector);

      fireEvent.click(screen.getByTestId('loginCard-basic/basic'));
      expectPageMode(PageMode.Form);

      fireEvent.click(screen.getByTestId('loginHelpLink'));
      expectPageMode(PageMode.LoginHelp);

      expect(screen.getByTestId('loginHelp')).toMatchSnapshot('Login Help');

      fireEvent.click(screen.getByTestId('loginBackToLoginLink'));
      expectPageMode(PageMode.Form);

      fireEvent.click(screen.getByTestId('loginBackToSelector'));
      expectPageMode(PageMode.Selector);

      expect(coreStartMock.http.post).not.toHaveBeenCalled();
      expect(coreStartMock.notifications.toasts.addError).not.toHaveBeenCalled();
    });
  });

  describe('auto login', () => {
    it('automatically switches to the Login Form mode if provider suggested by the auth provider hint needs it', () => {
      const coreStartMock = coreMock.createStart();
      render(
        <I18nProvider>
          <EuiProvider>
            <LoginForm
              http={coreStartMock.http}
              notifications={coreStartMock.notifications}
              loginHelp={'**Hey this is a login help message**'}
              loginAssistanceMessage="Need assistance?"
              authProviderHint="basic1"
              selector={{
                enabled: true,
                providers: [
                  { type: 'basic', name: 'basic1', usesLoginForm: true, showInSelector: true },
                  { type: 'saml', name: 'saml1', usesLoginForm: false, showInSelector: true },
                ],
              }}
            />
          </EuiProvider>
        </I18nProvider>
      );

      expectPageMode(PageMode.Form);
      expect(screen.getByTestId('loginHelpLink')).toHaveTextContent('Need help?');
      expect(screen.getByTestId('loginAssistanceMessage')).toHaveTextContent('Need assistance?');
    });

    it('automatically logs in if provider suggested by the auth provider hint is displayed in the selector', async () => {
      const currentURL = `https://some-host/login?next=${encodeURIComponent(
        '/some-base-path/app/kibana#/home?_g=()'
      )}`;
      const coreStartMock = coreMock.createStart({ basePath: '/some-base-path' });
      coreStartMock.http.post.mockResolvedValue({
        location: 'https://external-idp/login?optional-arg=2#optional-hash',
      });

      window.location.href = currentURL;
      render(
        <I18nProvider>
          <EuiProvider>
            <LoginForm
              http={coreStartMock.http}
              notifications={coreStartMock.notifications}
              loginHelp={'**Hey this is a login help message**'}
              loginAssistanceMessage="Need assistance?"
              authProviderHint="saml1"
              selector={{
                enabled: true,
                providers: [
                  { type: 'basic', name: 'basic1', usesLoginForm: true, showInSelector: true },
                  { type: 'saml', name: 'saml1', usesLoginForm: false, showInSelector: true },
                ],
              }}
            />
          </EuiProvider>
        </I18nProvider>
      );

      expectAutoLoginOverlay();

      await waitFor(() =>
        expect(window.location.href).toBe('https://external-idp/login?optional-arg=2#optional-hash')
      );

      expect(coreStartMock.http.post).toHaveBeenCalledTimes(1);
      expect(coreStartMock.http.post).toHaveBeenCalledWith('/internal/security/login', {
        body: JSON.stringify({ providerType: 'saml', providerName: 'saml1', currentURL }),
      });

      expect(screen.queryByTestId('loginErrorMessage')).not.toBeInTheDocument();
      expect(coreStartMock.notifications.toasts.addError).not.toHaveBeenCalled();
    });

    it('automatically logs in if provider suggested by the auth provider hint is not displayed in the selector', async () => {
      const currentURL = `https://some-host/login?next=${encodeURIComponent(
        '/some-base-path/app/kibana#/home?_g=()'
      )}`;
      const coreStartMock = coreMock.createStart({ basePath: '/some-base-path' });
      coreStartMock.http.post.mockResolvedValue({
        location: 'https://external-idp/login?optional-arg=2#optional-hash',
      });

      window.location.href = currentURL;
      render(
        <I18nProvider>
          <EuiProvider>
            <LoginForm
              http={coreStartMock.http}
              notifications={coreStartMock.notifications}
              loginHelp={'**Hey this is a login help message**'}
              loginAssistanceMessage="Need assistance?"
              authProviderHint="saml1"
              selector={{
                enabled: true,
                providers: [
                  { type: 'basic', name: 'basic1', usesLoginForm: true, showInSelector: true },
                  { type: 'saml', name: 'saml1', usesLoginForm: false, showInSelector: false },
                ],
              }}
            />
          </EuiProvider>
        </I18nProvider>
      );

      expectAutoLoginOverlay();

      await waitFor(() =>
        expect(window.location.href).toBe('https://external-idp/login?optional-arg=2#optional-hash')
      );

      expect(coreStartMock.http.post).toHaveBeenCalledTimes(1);
      expect(coreStartMock.http.post).toHaveBeenCalledWith('/internal/security/login', {
        body: JSON.stringify({ providerType: 'saml', providerName: 'saml1', currentURL }),
      });

      expect(screen.queryByTestId('loginErrorMessage')).not.toBeInTheDocument();
      expect(coreStartMock.notifications.toasts.addError).not.toHaveBeenCalled();
    });

    it('switches to the login selector if could not login with provider suggested by the auth provider hint', async () => {
      const currentURL = `https://some-host/login?next=${encodeURIComponent(
        '/some-base-path/app/kibana#/home?_g=()'
      )}`;

      const failureReason = new Error('Oh no!');
      const coreStartMock = coreMock.createStart({ basePath: '/some-base-path' });
      coreStartMock.http.post.mockRejectedValue(failureReason);

      window.location.href = currentURL;
      render(
        <I18nProvider>
          <EuiProvider>
            <LoginForm
              http={coreStartMock.http}
              notifications={coreStartMock.notifications}
              loginHelp={'**Hey this is a login help message**'}
              loginAssistanceMessage="Need assistance?"
              authProviderHint="saml1"
              selector={{
                enabled: true,
                providers: [
                  { type: 'basic', name: 'basic1', usesLoginForm: true, showInSelector: true },
                  { type: 'saml', name: 'saml1', usesLoginForm: false, showInSelector: true },
                ],
              }}
            />
          </EuiProvider>
        </I18nProvider>
      );

      expectAutoLoginOverlay();

      await waitFor(() =>
        expect(coreStartMock.notifications.toasts.addError).toHaveBeenCalledWith(failureReason, {
          title: 'Could not perform login.',
          toastMessage: 'Oh no!',
        })
      );

      expect(coreStartMock.http.post).toHaveBeenCalledTimes(1);
      expect(coreStartMock.http.post).toHaveBeenCalledWith('/internal/security/login', {
        body: JSON.stringify({ providerType: 'saml', providerName: 'saml1', currentURL }),
      });

      expect(window.location.href).toBe(currentURL);

      expectPageMode(PageMode.Selector);
      expect(screen.getByTestId('loginHelpLink')).toHaveTextContent('Need help?');
      expect(screen.getByTestId('loginAssistanceMessage')).toHaveTextContent('Need assistance?');
    });
  });
});
