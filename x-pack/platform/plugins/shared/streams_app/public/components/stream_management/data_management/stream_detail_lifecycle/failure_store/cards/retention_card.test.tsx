/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { RetentionCard } from './retention_card';
import type { useFailureStoreConfig } from '../../hooks/use_failure_store_config';

const renderI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

const createMockConfig = (
  config: Partial<ReturnType<typeof useFailureStoreConfig>>
): ReturnType<typeof useFailureStoreConfig> => ({
  failureStoreEnabled: true,
  customRetentionPeriod: undefined,
  defaultRetentionPeriod: '30d',
  retentionDisabled: false,
  inheritOptions: {
    canShowInherit: false,
    isWired: false,
    isCurrentlyInherited: false,
  },
  ...config,
});

describe('RetentionCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when failureStore disabled', () => {
    const mockConfig = createMockConfig({ failureStoreEnabled: false });
    const { container } = renderI18n(
      <RetentionCard
        openModal={jest.fn()}
        canManageFailureStore={true}
        failureStoreConfig={mockConfig}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders custom retention metric + lifecycle summary subtitle', () => {
    const mockConfig = createMockConfig({ customRetentionPeriod: '7d' });
    renderI18n(
      <RetentionCard
        openModal={jest.fn()}
        canManageFailureStore={true}
        failureStoreConfig={mockConfig}
      />
    );

    expect(screen.getByTestId('failureStoreRetention-metric')).toHaveTextContent('7 days');
    expect(screen.getByTestId('failureStoreRetention-metric-subtitle')).toHaveTextContent(
      '2 data phases'
    );
  });

  it('renders default retention metric + lifecycle summary subtitle', () => {
    const mockConfig = createMockConfig({});
    renderI18n(
      <RetentionCard
        openModal={jest.fn()}
        canManageFailureStore={true}
        failureStoreConfig={mockConfig}
      />
    );

    expect(screen.getByTestId('failureStoreRetention-metric')).toHaveTextContent('30 days');
    expect(screen.getByTestId('failureStoreRetention-metric-subtitle')).toHaveTextContent(
      '2 data phases'
    );
  });

  it('includes edit action when privileged', () => {
    const openModal = jest.fn();
    const mockConfig = createMockConfig({});
    renderI18n(
      <RetentionCard
        openModal={openModal}
        canManageFailureStore={true}
        failureStoreConfig={mockConfig}
      />
    );
    fireEvent.click(screen.getByTestId('streamFailureStoreEditRetention'));
    expect(openModal).toHaveBeenCalledWith(true);
  });

  it('omits edit action when lacking privilege', () => {
    const mockConfig = createMockConfig({});
    renderI18n(
      <RetentionCard
        openModal={jest.fn()}
        canManageFailureStore={false}
        failureStoreConfig={mockConfig}
      />
    );
    expect(screen.queryByTestId('streamFailureStoreEditRetention')).toBeNull();
  });

  it('renders infinite retention when lifecycle is disabled', () => {
    const mockConfig = createMockConfig({ retentionDisabled: true });
    renderI18n(
      <RetentionCard
        openModal={jest.fn()}
        canManageFailureStore={true}
        failureStoreConfig={mockConfig}
      />
    );

    expect(screen.getByTestId('failureStoreRetention-metric')).toHaveTextContent('∞');
    expect(screen.getByTestId('failureStoreRetention-metric-subtitle')).toHaveTextContent(
      '1 data phase'
    );
  });
});
