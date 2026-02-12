/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { ClassicStreamDetailManagement } from './classic';
import { createMockClassicStreamDefinition } from '../shared/mocks';

jest.mock('../../../hooks/use_streams_app_params', () => ({
  useStreamsAppParams: () => ({
    path: { key: 'logs.classic-test', tab: 'advanced' },
  }),
}));

jest.mock('../../../hooks/use_ai_features', () => ({
  useAIFeatures: () => ({}),
}));

jest.mock('./wrapper', () => ({
  Wrapper: ({ tabs, tab }: any) => <div>{tabs[tab]?.content}</div>,
}));

jest.mock('../../stream_detail_features/stream_description', () => ({
  StreamDescription: () => <div data-test-subj="streamDescriptionPanel" />,
}));

jest.mock('./unmanaged_elasticsearch_assets', () => ({
  UnmanagedElasticsearchAssets: () => <div data-test-subj="unmanagedAssetsPanel" />,
}));

jest.mock('../../../hooks/use_streams_privileges');
import { useStreamsPrivileges } from '../../../hooks/use_streams_privileges';

const mockUseStreamsPrivileges = useStreamsPrivileges as jest.MockedFunction<
  typeof useStreamsPrivileges
>;

const mockRefreshDefinition = jest.fn();

describe('Classic advanced view gating', () => {
  const definition = createMockClassicStreamDefinition();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hides StreamDescription in Advanced tab when enabled=true and available=false', () => {
    mockUseStreamsPrivileges.mockReturnValue({
      isLoading: false,
      features: {
        attachments: { enabled: false },
        groupStreams: { enabled: false },
        significantEvents: { enabled: true, available: false },
      },
    } as any);

    renderWithI18n(
      <ClassicStreamDetailManagement
        definition={definition}
        refreshDefinition={mockRefreshDefinition}
      />
    );

    expect(screen.queryByTestId('streamDescriptionPanel')).not.toBeInTheDocument();
    expect(screen.getByTestId('unmanagedAssetsPanel')).toBeInTheDocument();
  });

  it('hides StreamDescription in Advanced tab when enabled=true and available=undefined', () => {
    mockUseStreamsPrivileges.mockReturnValue({
      isLoading: false,
      features: {
        attachments: { enabled: false },
        groupStreams: { enabled: false },
        significantEvents: { enabled: true },
      },
    } as any);

    renderWithI18n(
      <ClassicStreamDetailManagement
        definition={definition}
        refreshDefinition={mockRefreshDefinition}
      />
    );

    expect(screen.queryByTestId('streamDescriptionPanel')).not.toBeInTheDocument();
    expect(screen.getByTestId('unmanagedAssetsPanel')).toBeInTheDocument();
  });

  it('shows StreamDescription in Advanced tab when enabled=true and available=true', () => {
    mockUseStreamsPrivileges.mockReturnValue({
      isLoading: false,
      features: {
        attachments: { enabled: false },
        groupStreams: { enabled: false },
        significantEvents: { enabled: true, available: true },
      },
    } as any);

    renderWithI18n(
      <ClassicStreamDetailManagement
        definition={definition}
        refreshDefinition={mockRefreshDefinition}
      />
    );

    expect(screen.getByTestId('streamDescriptionPanel')).toBeInTheDocument();
    expect(screen.getByTestId('unmanagedAssetsPanel')).toBeInTheDocument();
  });
});
