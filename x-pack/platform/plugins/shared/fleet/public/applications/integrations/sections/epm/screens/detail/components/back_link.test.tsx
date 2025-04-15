/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';

import { useStartServices } from '../../../../../../../hooks';

import { BackLink } from './back_link';

jest.mock('../../../../../../../hooks', () => {
  return {
    ...jest.requireActual('../../../../../../../hooks'),
    useStartServices: jest.fn().mockReturnValue({
      application: { navigateToApp: jest.fn() },
    }),
  };
});

describe('BackLink', () => {
  beforeEach(() => {
    jest.mocked(useStartServices().application.navigateToApp).mockReset();
  });

  it('renders back to selection link when returnAppId and returnPath are present', async () => {
    const appId = 'observabilityOnboarding';
    const path = '?category=aws';
    const queryParams = new URLSearchParams();
    queryParams.set('returnAppId', appId);
    queryParams.set('returnPath', path);

    const { getByText } = render(
      <I18nProvider>
        <BackLink queryParams={queryParams} integrationsPath="/browse" />
      </I18nProvider>
    );
    expect(getByText('Back to selection')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(getByText('Back to selection'));
    });
    await waitFor(() => {
      expect(useStartServices().application.navigateToApp).toHaveBeenCalledWith(appId, {
        path,
      });
    });
  });

  it('renders back to integrations link when no query params are present', async () => {
    const appId = 'integrations';
    const path = '/browse';
    const queryParams = new URLSearchParams();
    const { getByText } = render(
      <I18nProvider>
        <BackLink queryParams={queryParams} integrationsPath="/browse" />
      </I18nProvider>
    );
    expect(getByText('Back to integrations')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(getByText('Back to integrations'));
    });
    await waitFor(() => {
      expect(useStartServices().application.navigateToApp).toHaveBeenCalledWith(appId, {
        path,
      });
    });
  });
});
