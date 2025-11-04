/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { FailureStore } from '@kbn/streams-schema/src/models/ingest/failure_store';
import { RetentionCard } from './retention_card';

// Mock discover link hook with a simpler implementation
jest.mock('../../hooks/use_failure_store_redirect_link', () => ({
  useFailureStoreRedirectLink: () => ({ href: '/app/discover#/?_a=test' }),
}));

const customFailureStore: FailureStore = {
  retentionPeriod: {
    custom: '7d',
  },
  enabled: true,
};

const defaultFailureStore: FailureStore = {
  retentionPeriod: {
    default: '30d',
  },
  enabled: true,
};

const renderI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('RetentionCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when failureStore missing', () => {
    const { container } = renderI18n(
      <RetentionCard
        openModal={jest.fn()}
        canManageFailureStore={true}
        isWired={true}
        streamName="logs-test"
        failureStore={undefined}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null when retentionPeriod missing', () => {
    const { container } = renderI18n(
      <RetentionCard
        openModal={jest.fn()}
        canManageFailureStore={true}
        isWired={true}
        streamName="logs-test"
        failureStore={{ enabled: true, retentionPeriod: {} }}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders custom retention metric and subtitle', () => {
    renderI18n(
      <RetentionCard
        openModal={jest.fn()}
        canManageFailureStore={true}
        isWired={true}
        streamName="logs-test"
        failureStore={customFailureStore}
      />
    );

    expect(screen.getByTestId('failureStoreRetention-metric')).toHaveTextContent('7 days');
    expect(screen.getByTestId('failureStoreRetention-metric-subtitle')).toHaveTextContent(
      /Custom retention period/i
    );
  });

  it('renders default retention metric and subtitle', () => {
    renderI18n(
      <RetentionCard
        openModal={jest.fn()}
        canManageFailureStore={true}
        isWired={true}
        streamName="logs-test"
        failureStore={defaultFailureStore}
      />
    );

    expect(screen.getByTestId('failureStoreRetention-metric')).toHaveTextContent('30 days');
    expect(screen.getByTestId('failureStoreRetention-metric-subtitle')).toHaveTextContent(
      /Default retention period/i
    );
  });

  it('includes edit & discover actions when privileged and not wired', () => {
    const openModal = jest.fn();
    renderI18n(
      <RetentionCard
        openModal={openModal}
        canManageFailureStore={true}
        isWired={false}
        streamName="logs-test"
        failureStore={defaultFailureStore}
      />
    );
    fireEvent.click(screen.getByTestId('streamFailureStoreEditRetention'));
    expect(openModal).toHaveBeenCalledWith(true);
    expect(screen.getByTestId('streamFailureStoreViewInDiscover')).toBeInTheDocument();
  });

  it('omits edit action when lacking privilege', () => {
    renderI18n(
      <RetentionCard
        openModal={jest.fn()}
        canManageFailureStore={false}
        isWired={true}
        streamName="logs-test"
        failureStore={defaultFailureStore}
      />
    );
    expect(screen.queryByTestId('streamFailureStoreEditRetention')).toBeNull();
    expect(screen.getByTestId('streamFailureStoreViewInDiscover')).toBeInTheDocument();
  });

  it('omits edit action when stream is wired even if privileged', () => {
    renderI18n(
      <RetentionCard
        openModal={jest.fn()}
        canManageFailureStore={true}
        isWired={true}
        streamName="logs-test"
        failureStore={defaultFailureStore}
      />
    );
    expect(screen.queryByTestId('streamFailureStoreEditRetention')).toBeNull();
    expect(screen.getByTestId('streamFailureStoreViewInDiscover')).toBeInTheDocument();
  });
});
