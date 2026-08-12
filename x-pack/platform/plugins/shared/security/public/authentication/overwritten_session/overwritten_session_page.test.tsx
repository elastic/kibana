/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, waitFor } from '@testing-library/react';
import React from 'react';

import { coreMock } from '@kbn/core/public/mocks';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { OverwrittenSessionPage } from './overwritten_session_page';
import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import { authenticationMock } from '../index.mock';

describe('OverwrittenSessionPage', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      value: { href: 'https://some-host' },
      writable: true,
    });
  });

  it('renders as expected', async () => {
    const basePathMock = coreMock.createStart({ basePath: '/mock-base-path' }).http.basePath;
    const authenticationSetupMock = authenticationMock.createSetup();
    authenticationSetupMock.getCurrentUser.mockResolvedValue(
      mockAuthenticatedUser({ username: 'mock-user' })
    );

    const { container } = renderWithI18n(
      <OverwrittenSessionPage basePath={basePathMock} authc={authenticationSetupMock} />
    );

    // Shouldn't render anything if username isn't yet available.
    expect(container).toBeEmptyDOMElement();

    expect(await screen.findByTestId('secAuthenticationStatePage')).toBeInTheDocument();

    expect(container.firstChild).toMatchSnapshot();
  });

  it('properly parses `next` parameter', async () => {
    window.location.href = `https://host.com/mock-base-path/security/overwritten_session?next=${encodeURIComponent(
      '/mock-base-path/app/home#/?_g=()'
    )}`;

    const basePathMock = coreMock.createStart({ basePath: '/mock-base-path' }).http.basePath;
    const authenticationSetupMock = authenticationMock.createSetup();
    authenticationSetupMock.getCurrentUser.mockResolvedValue(
      mockAuthenticatedUser({ username: 'mock-user' })
    );

    renderWithI18n(
      <OverwrittenSessionPage basePath={basePathMock} authc={authenticationSetupMock} />
    );

    await waitFor(() =>
      expect(screen.getByRole('link', { name: /Continue as mock-user/ })).toHaveAttribute(
        'href',
        '/mock-base-path/app/home#/?_g=()'
      )
    );
  });
});
