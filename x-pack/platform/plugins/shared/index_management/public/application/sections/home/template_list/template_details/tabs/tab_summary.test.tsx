/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';

import type { TemplateDeserialized } from '../../../../../../../common';
import { TabSummary } from './tab_summary';

jest.mock('@kbn/i18n-react', () => ({
  FormattedMessage: ({ defaultMessage }: { defaultMessage: string }) => (
    <span>{defaultMessage}</span>
  ),
}));

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    EuiIconTip: ({ content }: { content: string }) => (
      <span data-test-subj="iconTip" data-content={content} />
    ),
  };
});

const mockUseAppContext = jest.fn();
jest.mock('../../../../../app_context', () => ({
  useAppContext: () => mockUseAppContext(),
}));

const mockUseLoadFailureStoreSettings = jest.fn();
jest.mock('../../../../../services/api', () => ({
  useLoadFailureStoreSettings: () => mockUseLoadFailureStoreSettings(),
}));

jest.mock('../../../../../services/use_ilm_locator', () => ({
  useIlmLocator: () => undefined,
}));

jest.mock('../../../../../services/use_ingest_pipeline_locator', () => ({
  useIngestPipelinesLocator: () => '',
}));

const makeTemplateDetails = (
  overrides: Partial<TemplateDeserialized> = {}
): TemplateDeserialized => ({
  name: 'my_template',
  indexPatterns: ['logs-*'],
  allowAutoCreate: 'NO_OVERWRITE',
  template: {},
  _kbnMeta: { type: 'default', hasDatastream: true, isLegacy: false },
  ...overrides,
});

describe('Index template TabSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppContext.mockReturnValue({
      core: { application: { navigateToUrl: jest.fn() } },
      url: {
        locators: {
          get: () => ({ getRedirectUrl: () => '' }),
        },
      },
      config: { isServerless: false },
    });
  });

  it('shows default retention value and tooltip when retention is not explicitly configured', () => {
    mockUseLoadFailureStoreSettings.mockReturnValue({
      data: { defaultRetentionPeriod: '30d' },
    });

    render(
      <TabSummary
        templateDetails={makeTemplateDetails({
          template: {
            data_stream_options: { failure_store: { enabled: true } },
          },
        })}
      />
    );

    expect(screen.getByText('Failed data lifecycle')).toBeInTheDocument();
    const detail = screen.getByTestId('failedDataLifecycleTemplateDetail');
    expect(within(detail).getByText(/30 days/)).toBeInTheDocument();
    expect(within(detail).getByText(/2 data phases/)).toBeInTheDocument();

    const tooltip = within(detail).getByTestId('iconTip');
    expect(tooltip.getAttribute('data-content')).toMatch(/cluster default failed data retention/i);
    expect(tooltip.getAttribute('data-content')).toMatch(/template/i);
    expect(tooltip.getAttribute('data-content')).toMatch(/30 days/i);
  });

  it('shows Disabled when failure store is disabled', () => {
    mockUseLoadFailureStoreSettings.mockReturnValue({ data: { defaultRetentionPeriod: '30d' } });

    render(
      <TabSummary
        templateDetails={makeTemplateDetails({
          template: {
            data_stream_options: { failure_store: { enabled: false } },
          },
        })}
      />
    );

    const detail = screen.getByTestId('failedDataLifecycleTemplateDetail');
    expect(within(detail).getByText('Disabled')).toBeInTheDocument();
    expect(within(detail).queryByTestId('iconTip')).not.toBeInTheDocument();
  });

  it('shows ∞ when retention lifecycle is explicitly disabled', () => {
    mockUseLoadFailureStoreSettings.mockReturnValue({ data: { defaultRetentionPeriod: '30d' } });

    render(
      <TabSummary
        templateDetails={makeTemplateDetails({
          template: {
            data_stream_options: {
              failure_store: { enabled: true, lifecycle: { enabled: false } },
            },
          },
        })}
      />
    );

    const detail = screen.getByTestId('failedDataLifecycleTemplateDetail');
    expect(within(detail).getByText(/∞/)).toBeInTheDocument();
    expect(within(detail).queryByTestId('iconTip')).not.toBeInTheDocument();
  });

  it('shows ∞ when an explicit infinite (-1) retention is configured', () => {
    mockUseLoadFailureStoreSettings.mockReturnValue({ data: { defaultRetentionPeriod: '30d' } });

    render(
      <TabSummary
        templateDetails={makeTemplateDetails({
          template: {
            data_stream_options: {
              failure_store: { enabled: true, lifecycle: { enabled: true, data_retention: -1 } },
            },
          },
        })}
      />
    );

    const detail = screen.getByTestId('failedDataLifecycleTemplateDetail');
    expect(within(detail).getByText(/∞/)).toBeInTheDocument();
    expect(within(detail).queryByText(/30 days/)).not.toBeInTheDocument();
    expect(within(detail).queryByTestId('iconTip')).not.toBeInTheDocument();
  });

  it('shows ∞ when no retention is configured anywhere (no explicit value, no cluster default)', () => {
    mockUseLoadFailureStoreSettings.mockReturnValue({ data: {} });

    render(
      <TabSummary
        templateDetails={makeTemplateDetails({
          template: {
            data_stream_options: { failure_store: { enabled: true } },
          },
        })}
      />
    );

    const detail = screen.getByTestId('failedDataLifecycleTemplateDetail');
    expect(within(detail).getByText(/∞/)).toBeInTheDocument();
    expect(within(detail).queryByTestId('iconTip')).not.toBeInTheDocument();
  });

  it('shows an error indicator when the cluster default request fails and no explicit retention is set', () => {
    mockUseLoadFailureStoreSettings.mockReturnValue({ error: { message: 'Request failed' } });

    render(
      <TabSummary
        templateDetails={makeTemplateDetails({
          template: {
            data_stream_options: { failure_store: { enabled: true } },
          },
        })}
      />
    );

    const detail = screen.getByTestId('failedDataLifecycleTemplateDetail');
    expect(within(detail).queryByText(/∞/)).not.toBeInTheDocument();

    const tooltip = within(detail).getByTestId('iconTip');
    expect(tooltip.getAttribute('data-content')).toMatch(/unable to load/i);
  });

  it('ignores a failed cluster default request when an explicit retention is configured', () => {
    mockUseLoadFailureStoreSettings.mockReturnValue({ error: { message: 'Request failed' } });

    render(
      <TabSummary
        templateDetails={makeTemplateDetails({
          template: {
            data_stream_options: {
              failure_store: { enabled: true, lifecycle: { enabled: true, data_retention: '15d' } },
            },
          },
        })}
      />
    );

    const detail = screen.getByTestId('failedDataLifecycleTemplateDetail');
    expect(within(detail).getByText(/15 days/)).toBeInTheDocument();
    expect(within(detail).queryByTestId('iconTip')).not.toBeInTheDocument();
  });
});
