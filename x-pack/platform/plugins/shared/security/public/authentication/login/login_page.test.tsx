/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiThemeProvider } from '@elastic/eui';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { of } from 'rxjs';

import { coreMock } from '@kbn/core/public/mocks';
import { customBrandingServiceMock } from '@kbn/core-custom-branding-browser-mocks';
import { I18nProvider } from '@kbn/i18n-react';

import { LoginPage } from './login_page';
import { AUTH_PROVIDER_HINT_QUERY_STRING_PARAMETER } from '../../../common/constants';
import type { LoginState } from '../../../common/login_state';

const createLoginState = (options?: Partial<LoginState>) => {
  return {
    allowLogin: true,
    layout: 'form',
    requiresSecureConnection: false,
    selector: {
      enabled: false,
      providers: [{ type: 'basic', name: 'basic1', usesLoginForm: true }],
    },
    customBranding: {},
    ...options,
  } as LoginState;
};

const renderPage = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiThemeProvider>{ui}</EuiThemeProvider>
    </I18nProvider>
  );

describe('LoginPage', () => {
  const httpMock = {
    get: jest.fn(),
    addLoadingCountSource: jest.fn(),
  } as any;
  const resetHttpMock = () => {
    httpMock.get.mockReset();
    httpMock.addLoadingCountSource.mockReset();
  };
  const customBrandingMock = customBrandingServiceMock.createStartContract();

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { href: 'http://some-host/bar', protocol: 'http' },
      writable: true,
    });

    resetHttpMock();
    customBrandingMock.customBranding$ = of({});
  });

  describe('page', () => {
    it('renders as expected', async () => {
      const coreStartMock = coreMock.createStart();
      httpMock.get.mockResolvedValue(createLoginState());

      const { container } = renderPage(
        <LoginPage
          http={httpMock}
          customBranding={customBrandingMock}
          notifications={coreStartMock.notifications}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('loginSubmit')).toBeInTheDocument();
      });
      expect(container.children[0]).toMatchSnapshot();
    });

    it('renders with custom branding', async () => {
      const coreStartMock = coreMock.createStart();
      customBrandingMock.customBranding$ = of({ logo: 'logo' });
      httpMock.get.mockResolvedValue(createLoginState());

      const { container } = renderPage(
        <LoginPage
          http={httpMock}
          customBranding={customBrandingMock}
          notifications={coreStartMock.notifications}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('loginSubmit')).toBeInTheDocument();
      });
      expect(container.children[0]).toMatchSnapshot();
    });
  });

  describe('disabled form states', () => {
    const originalNavigator = window.navigator;
    const originalTop = window.top;

    afterEach(function () {
      Object.defineProperty(window, 'navigator', {
        value: originalNavigator,
        writable: true,
      });
      Object.defineProperty(window, 'top', {
        value: originalTop,
        writable: true,
      });
    });

    it('renders as expected when secure connection is required but not present', async () => {
      const coreStartMock = coreMock.createStart();
      httpMock.get.mockResolvedValue(createLoginState({ requiresSecureConnection: true }));

      const { container } = renderPage(
        <LoginPage
          http={httpMock}
          notifications={coreStartMock.notifications}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
          customBranding={customBrandingMock}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('A secure connection is required for log in')).toBeInTheDocument();
        expect(screen.queryByTestId('loginSubmit')).not.toBeInTheDocument();
      });
      expect(container.children[0]).toMatchSnapshot();
    });

    it('renders as expected when a connection to ES is not available', async () => {
      const coreStartMock = coreMock.createStart();
      httpMock.get.mockResolvedValue(createLoginState({ layout: 'error-es-unavailable' }));

      const { container } = renderPage(
        <LoginPage
          http={httpMock}
          notifications={coreStartMock.notifications}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
          customBranding={customBrandingMock}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Cannot connect to the Elasticsearch cluster')).toBeInTheDocument();
        expect(screen.queryByTestId('loginSubmit')).not.toBeInTheDocument();
      });
      expect(container.children[0]).toMatchSnapshot();
    });

    it('renders as expected when xpack is not available', async () => {
      const coreStartMock = coreMock.createStart();
      httpMock.get.mockResolvedValue(createLoginState({ layout: 'error-xpack-unavailable' }));

      const { container } = renderPage(
        <LoginPage
          http={httpMock}
          notifications={coreStartMock.notifications}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
          customBranding={customBrandingMock}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText(
            'Cannot connect to the Elasticsearch cluster currently configured for Kibana.'
          )
        ).toBeInTheDocument();
        expect(screen.queryByTestId('loginSubmit')).not.toBeInTheDocument();
      });
      expect(container.children[0]).toMatchSnapshot();
    });

    it('renders as expected when an unknown loginState layout is provided', async () => {
      const coreStartMock = coreMock.createStart();
      httpMock.get.mockResolvedValue(
        createLoginState({ layout: 'error-asdf-asdf-unknown' as any })
      );

      const { container } = renderPage(
        <LoginPage
          http={httpMock}
          notifications={coreStartMock.notifications}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
          customBranding={customBrandingMock}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Unsupported login form layout.')).toBeInTheDocument();
        expect(screen.queryByTestId('loginSubmit')).not.toBeInTheDocument();
      });
      expect(container.children[0]).toMatchSnapshot();
    });

    it('renders as expected when login is not enabled', async () => {
      const coreStartMock = coreMock.createStart();
      httpMock.get.mockResolvedValue(
        createLoginState({ selector: { enabled: false, providers: [] } })
      );

      const { container } = renderPage(
        <LoginPage
          http={httpMock}
          notifications={coreStartMock.notifications}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
          customBranding={customBrandingMock}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Login is disabled.')).toBeInTheDocument();
        expect(screen.queryByTestId('loginSubmit')).not.toBeInTheDocument();
      });
      expect(container.children[0]).toMatchSnapshot();
    });

    it('renders CTA and cross-origin cookie warning when cookies are disabled, document is embedded inside iframe, and cross-origin cookies are blocked', async () => {
      const coreStartMock = coreMock.createStart();
      httpMock.get.mockResolvedValue(createLoginState());

      Object.defineProperty(window, 'navigator', {
        value: { cookieEnabled: false },
        writable: true,
      });
      Object.defineProperty(window, 'top', {
        value: {},
        writable: true,
      });

      const { container } = renderPage(
        <LoginPage
          http={httpMock}
          notifications={coreStartMock.notifications}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
          sameSiteCookies="Lax"
          customBranding={customBrandingMock}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText(
            'To view this content, open it in a new window or ask your administrator to allow cross-origin cookies.'
          )
        ).toBeInTheDocument();
        expect(screen.getByText('Open in new window')).toBeInTheDocument();
      });
      expect(container.children[0]).toMatchSnapshot();
    });

    it('renders CTA and browser settings warning when cookies are disabled, document is embedded inside iframe, and cross-origin cookies are allowed', async () => {
      const coreStartMock = coreMock.createStart();
      httpMock.get.mockResolvedValue(createLoginState());

      Object.defineProperty(window, 'navigator', {
        value: { cookieEnabled: false },
        writable: true,
      });
      Object.defineProperty(window, 'top', {
        value: {},
        writable: true,
      });

      const { container } = renderPage(
        <LoginPage
          http={httpMock}
          notifications={coreStartMock.notifications}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
          sameSiteCookies="None"
          customBranding={customBrandingMock}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText(
            'To view this content, open it in a new window or adjust your browser settings to allow third-party cookies.'
          )
        ).toBeInTheDocument();
        expect(screen.getByText('Open in new window')).toBeInTheDocument();
      });
      expect(container.children[0]).toMatchSnapshot();
    });

    it('renders warning when cookies are disabled and document is not embedded inside iframe', async () => {
      const coreStartMock = coreMock.createStart();
      httpMock.get.mockResolvedValue(createLoginState());

      Object.defineProperty(window, 'navigator', {
        value: { cookieEnabled: false },
        writable: true,
      });

      const { container } = renderPage(
        <LoginPage
          http={httpMock}
          notifications={coreStartMock.notifications}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
          customBranding={customBrandingMock}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Cookies are required to log in to Elastic')).toBeInTheDocument();
        expect(screen.queryByTestId('loginSubmit')).not.toBeInTheDocument();
      });
      expect(container.children[0]).toMatchSnapshot();
    });
  });

  describe('enabled form state', () => {
    it('renders as expected', async () => {
      const coreStartMock = coreMock.createStart();
      httpMock.get.mockResolvedValue(createLoginState());

      const { container } = renderPage(
        <LoginPage
          http={httpMock}
          notifications={coreStartMock.notifications}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
          customBranding={customBrandingMock}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('loginSubmit')).toBeInTheDocument();
      });
      expect(container.children[0]).toMatchSnapshot();
    });

    it('properly passes query string parameters to the form', async () => {
      const coreStartMock = coreMock.createStart();
      httpMock.get.mockResolvedValue(createLoginState());
      window.location.href = `http://some-host/bar?msg=SESSION_EXPIRED&${AUTH_PROVIDER_HINT_QUERY_STRING_PARAMETER}=basic1`;

      renderPage(
        <LoginPage
          http={httpMock}
          notifications={coreStartMock.notifications}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
          customBranding={customBrandingMock}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('loginSubmit')).toBeInTheDocument();
        expect(
          screen.getByText('Your session has timed out. Please log in again.')
        ).toBeInTheDocument();
      });
    });

    it('renders as expected when loginAssistanceMessage is set', async () => {
      const coreStartMock = coreMock.createStart();
      httpMock.get.mockResolvedValue(createLoginState());

      const { container } = renderPage(
        <LoginPage
          http={httpMock}
          notifications={coreStartMock.notifications}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage="This is an *important* message"
          customBranding={customBrandingMock}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('loginSubmit')).toBeInTheDocument();
        expect(screen.getByTestId('loginAssistanceMessage')).toHaveTextContent(
          'This is an important message'
        );
      });
      expect(container.children[0]).toMatchSnapshot();
    });

    it('renders as expected when loginHelp is set', async () => {
      const coreStartMock = coreMock.createStart();
      httpMock.get.mockResolvedValue(createLoginState({ loginHelp: '**some-help**' }));

      const { container } = renderPage(
        <LoginPage
          http={httpMock}
          notifications={coreStartMock.notifications}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
          customBranding={customBrandingMock}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('loginSubmit')).toBeInTheDocument();
        expect(screen.getByTestId('loginHelpLink')).toBeInTheDocument();
      });
      expect(container.children[0]).toMatchSnapshot();
    });
  });

  describe('API calls', () => {
    it('GET login_state success', async () => {
      const coreStartMock = coreMock.createStart();
      httpMock.get.mockResolvedValue(createLoginState());

      renderPage(
        <LoginPage
          http={httpMock}
          notifications={coreStartMock.notifications}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
          customBranding={customBrandingMock}
        />
      );

      await waitFor(() => {
        expect(httpMock.addLoadingCountSource).toHaveBeenCalledTimes(1);
        expect(httpMock.get).toHaveBeenCalledTimes(1);
        expect(httpMock.get).toHaveBeenCalledWith('/internal/security/login_state');
        expect(coreStartMock.fatalErrors.add).not.toHaveBeenCalled();
      });
    });

    it('GET login_state failure', async () => {
      const coreStartMock = coreMock.createStart();
      const error = Symbol();
      httpMock.get.mockRejectedValue(error);

      renderPage(
        <LoginPage
          http={httpMock}
          notifications={coreStartMock.notifications}
          fatalErrors={coreStartMock.fatalErrors}
          loginAssistanceMessage=""
          customBranding={customBrandingMock}
        />
      );

      await waitFor(() => {
        expect(httpMock.addLoadingCountSource).toHaveBeenCalledTimes(1);
        expect(httpMock.get).toHaveBeenCalledTimes(1);
        expect(httpMock.get).toHaveBeenCalledWith('/internal/security/login_state');
        expect(coreStartMock.fatalErrors.add).toHaveBeenCalledTimes(1);
        expect(coreStartMock.fatalErrors.add).toHaveBeenCalledWith(error);
      });
    });
  });
});
