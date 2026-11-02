/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { DiscoverLink } from './discover_link';
import { useAppContext } from '../app_context';
import type { AppDependencies } from '../app_context';

jest.mock('../app_context', () => ({
  useAppContext: jest.fn(),
}));

const mockedUseAppContext = jest.mocked(useAppContext);

describe('DiscoverLink', () => {
  const indexName = 'my-fancy-index';

  const renderWithI18n = (ui: React.ReactElement) => {
    return render(<I18nProvider>{ui}</I18nProvider>);
  };

  beforeEach(() => {
    mockedUseAppContext.mockReset();
  });

  it('renders the link as an icon by default', () => {
    const navigateMock = jest.fn();
    mockedUseAppContext.mockReturnValue({
      url: {
        locators: {
          get: () => ({ navigate: navigateMock } as unknown),
        },
      },
    } as unknown as AppDependencies);

    renderWithI18n(<DiscoverLink indexName={indexName} />);

    expect(screen.getByTestId('discoverIconLink')).toBeInTheDocument();
    expect(screen.queryByTestId('discoverButtonLink')).not.toBeInTheDocument();
  });

  it('renders the link as a button if the prop is set', () => {
    const navigateMock = jest.fn();
    mockedUseAppContext.mockReturnValue({
      url: {
        locators: {
          get: () => ({ navigate: navigateMock } as unknown),
        },
      },
    } as unknown as AppDependencies);

    renderWithI18n(<DiscoverLink indexName={indexName} asButton={true} />);

    expect(screen.queryByTestId('discoverIconLink')).not.toBeInTheDocument();
    expect(screen.getByTestId('discoverButtonLink')).toBeInTheDocument();
  });

  it('calls navigate method when button is clicked', async () => {
    const navigateMock = jest.fn();
    mockedUseAppContext.mockReturnValue({
      url: {
        locators: {
          get: () => ({ navigate: navigateMock } as unknown),
        },
      },
    } as unknown as AppDependencies);

    renderWithI18n(<DiscoverLink indexName={indexName} />);

    fireEvent.click(screen.getByTestId('discoverIconLink'));
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith({ dataViewSpec: { title: indexName } });
    });
  });

  it('does not render a button if locators is not defined', () => {
    mockedUseAppContext.mockReturnValue({ url: undefined } as unknown as AppDependencies);

    renderWithI18n(<DiscoverLink indexName={indexName} />);

    expect(screen.queryByTestId('discoverIconLink')).not.toBeInTheDocument();
    expect(screen.queryByTestId('discoverButtonLink')).not.toBeInTheDocument();
  });
});
