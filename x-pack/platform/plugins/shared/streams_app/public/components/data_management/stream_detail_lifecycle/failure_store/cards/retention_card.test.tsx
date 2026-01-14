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
import { useFailureStoreConfig } from '../../hooks/use_failure_store_config';

// Mock discover link hook with a simpler implementation
jest.mock('../../hooks/use_failure_store_redirect_link', () => ({
  useFailureStoreRedirectLink: () => ({ href: '/app/discover#/?_a=test' }),
}));

jest.mock('../../hooks/use_failure_store_config', () => ({
  useFailureStoreConfig: jest.fn(),
}));

const mockUseFailureStoreConfig = useFailureStoreConfig as jest.MockedFunction<
  typeof useFailureStoreConfig
>;

const renderI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

const createMockConfig = (
  config: Partial<ReturnType<typeof useFailureStoreConfig>>
): ReturnType<typeof useFailureStoreConfig> => {
  const fullConfig = {
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
  };
  mockUseFailureStoreConfig.mockReturnValue(fullConfig);
  return fullConfig;
};

const mockClassicInheritConfig: ReturnType<typeof useFailureStoreConfig> = {
  failureStoreEnabled: true,
  customRetentionPeriod: undefined,
  defaultRetentionPeriod: '30d',
  retentionDisabled: false,
  inheritOptions: {
    canShowInherit: true,
    isWired: false,
    isCurrentlyInherited: true,
  },
};

const mockClassicOverrideConfig: ReturnType<typeof useFailureStoreConfig> = {
  failureStoreEnabled: true,
  customRetentionPeriod: '14d',
  defaultRetentionPeriod: '30d',
  retentionDisabled: false,
  inheritOptions: {
    canShowInherit: true,
    isWired: false,
    isCurrentlyInherited: false,
  },
};

const mockWiredInheritConfig: ReturnType<typeof useFailureStoreConfig> = {
  failureStoreEnabled: true,
  customRetentionPeriod: undefined,
  defaultRetentionPeriod: '30d',
  retentionDisabled: false,
  inheritOptions: {
    canShowInherit: true,
    isWired: true,
    isCurrentlyInherited: true,
  },
};

const mockWiredOverrideConfig: ReturnType<typeof useFailureStoreConfig> = {
  failureStoreEnabled: true,
  customRetentionPeriod: '7d',
  defaultRetentionPeriod: '30d',
  retentionDisabled: false,
  inheritOptions: {
    canShowInherit: true,
    isWired: true,
    isCurrentlyInherited: false,
  },
};

const mockWiredRootConfig: ReturnType<typeof useFailureStoreConfig> = {
  failureStoreEnabled: true,
  customRetentionPeriod: '30d',
  defaultRetentionPeriod: '30d',
  retentionDisabled: false,
  inheritOptions: {
    canShowInherit: false,
    isWired: true,
    isCurrentlyInherited: false,
  },
};

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
        streamName="logs-test"
        failureStoreConfig={mockConfig}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders custom retention metric and subtitle', () => {
    const mockConfig = createMockConfig({ customRetentionPeriod: '7d' });
    renderI18n(
      <RetentionCard
        openModal={jest.fn()}
        canManageFailureStore={true}
        streamName="logs-test"
        failureStoreConfig={mockConfig}
      />
    );

    expect(screen.getByTestId('failureStoreRetention-metric')).toHaveTextContent('7 days');
    expect(screen.getByTestId('failureStoreRetention-metric-subtitle')).toHaveTextContent(
      /Custom retention period/i
    );
  });

  it('renders default retention metric and subtitle', () => {
    const mockConfig = createMockConfig({});
    renderI18n(
      <RetentionCard
        openModal={jest.fn()}
        canManageFailureStore={true}
        streamName="logs-test"
        failureStoreConfig={mockConfig}
      />
    );

    expect(screen.getByTestId('failureStoreRetention-metric')).toHaveTextContent('30 days');
    expect(screen.getByTestId('failureStoreRetention-metric-subtitle')).toHaveTextContent(
      /Default retention period/i
    );
  });

  it('includes edit action when privileged', () => {
    const openModal = jest.fn();
    const mockConfig = createMockConfig({});
    renderI18n(
      <RetentionCard
        openModal={openModal}
        canManageFailureStore={true}
        streamName="logs-test"
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
        streamName="logs-test"
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
        streamName="logs-test"
        failureStoreConfig={mockConfig}
      />
    );

    expect(screen.getByTestId('failureStoreRetention-metric')).toHaveTextContent('∞');
    expect(screen.getByTestId('failureStoreRetention-metric-subtitle')).toHaveTextContent(
      /Indefinite retention/i
    );
  });

  describe('Retention Origin Labels', () => {
    describe('Classic Stream', () => {
      it('shows "Inherit from index template" when failure store is inherited', () => {
        mockUseFailureStoreConfig.mockReturnValue(mockClassicInheritConfig);
        renderI18n(
          <RetentionCard
            openModal={jest.fn()}
            canManageFailureStore={true}
            streamName="logs-test"
            failureStoreConfig={mockClassicInheritConfig}
          />
        );

        const subtitle = screen.getByTestId('failureStoreRetention-metric-subtitle');
        expect(subtitle).toHaveTextContent(/Inherit from index template/i);
        expect(subtitle).not.toHaveTextContent(/Override index template/i);
      });

      it('shows "Override index template" when failure store is not inherited', () => {
        mockUseFailureStoreConfig.mockReturnValue(mockClassicOverrideConfig);
        renderI18n(
          <RetentionCard
            openModal={jest.fn()}
            canManageFailureStore={true}
            streamName="logs-test"
            failureStoreConfig={mockClassicOverrideConfig}
          />
        );

        const subtitle = screen.getByTestId('failureStoreRetention-metric-subtitle');
        expect(subtitle).toHaveTextContent(/Override index template/i);
        expect(subtitle).not.toHaveTextContent(/Inherit from index template/i);
      });
    });

    describe('Wired Stream', () => {
      it('shows "Inherit from parent" when failure store is inherited and not root', () => {
        mockUseFailureStoreConfig.mockReturnValue(mockWiredInheritConfig);
        renderI18n(
          <RetentionCard
            openModal={jest.fn()}
            canManageFailureStore={true}
            streamName="logs.nginx-test"
            failureStoreConfig={mockWiredInheritConfig}
          />
        );

        const subtitle = screen.getByTestId('failureStoreRetention-metric-subtitle');
        expect(subtitle).toHaveTextContent(/Inherit from parent/i);
        expect(subtitle).not.toHaveTextContent(/Override parent/i);
      });

      it('shows "Override parent" when failure store is not inherited and not root', () => {
        mockUseFailureStoreConfig.mockReturnValue(mockWiredOverrideConfig);
        renderI18n(
          <RetentionCard
            openModal={jest.fn()}
            canManageFailureStore={true}
            streamName="logs.nginx-test"
            failureStoreConfig={mockWiredOverrideConfig}
          />
        );

        const subtitle = screen.getByTestId('failureStoreRetention-metric-subtitle');
        expect(subtitle).toHaveTextContent(/Override parent/i);
        expect(subtitle).not.toHaveTextContent(/Inherit from parent/i);
      });

      it('does not show origin label for root stream with explicit failure store', () => {
        mockUseFailureStoreConfig.mockReturnValue(mockWiredRootConfig);
        renderI18n(
          <RetentionCard
            openModal={jest.fn()}
            canManageFailureStore={true}
            streamName="logs"
            failureStoreConfig={mockWiredRootConfig}
          />
        );

        const subtitle = screen.getByTestId('failureStoreRetention-metric-subtitle');
        expect(subtitle).not.toHaveTextContent(/Inherit from parent/i);
        expect(subtitle).not.toHaveTextContent(/Override parent/i);
      });
    });
  });
});
