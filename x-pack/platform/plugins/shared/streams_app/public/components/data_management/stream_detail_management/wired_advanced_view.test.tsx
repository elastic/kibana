/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { WiredAdvancedView } from './wired_advanced_view';
import { createMockWiredStreamDefinition } from '../shared/mocks';

jest.mock('@kbn/ebt-tools', () => ({
  usePerformanceContext: () => ({ onPageReady: jest.fn() }),
}));

jest.mock('../../../hooks/use_ai_features', () => ({
  useAIFeatures: () => ({}),
}));

jest.mock('../../../hooks/use_streams_privileges');
import { useStreamsPrivileges } from '../../../hooks/use_streams_privileges';

jest.mock('../../stream_detail_features/stream_description', () => ({
  StreamDescription: () => <div data-test-subj="streamDescriptionPanel" />,
}));

jest.mock('../../stream_detail_features/stream_feature_configuration', () => ({
  StreamFeatureConfiguration: () => <div data-test-subj="streamFeatureConfigurationPanel" />,
}));

jest.mock('./advanced_view/index_configuration', () => ({
  IndexConfiguration: ({ children }: { children?: React.ReactNode }) => (
    <div data-test-subj="indexConfigurationPanel">{children}</div>
  ),
}));

jest.mock('./advanced_view/import_export', () => ({
  ImportExportPanel: () => <div data-test-subj="importExportPanel" />,
}));

jest.mock('./advanced_view/delete_stream', () => ({
  DeleteStreamPanel: () => <div data-test-subj="deleteStreamPanel" />,
}));

const mockUseStreamsPrivileges = useStreamsPrivileges as jest.MockedFunction<typeof useStreamsPrivileges>;

const mockRefreshDefinition = jest.fn();

describe('WiredAdvancedView', () => {
  const definition = createMockWiredStreamDefinition();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hides significant events enterprise panels when enabled=true and available=false', () => {
    mockUseStreamsPrivileges.mockReturnValue({
      features: {
        contentPacks: { enabled: false },
        significantEvents: { enabled: true, available: false },
      },
    } as any);

    renderWithI18n(<WiredAdvancedView definition={definition} refreshDefinition={mockRefreshDefinition} />);

    expect(screen.queryByTestId('streamDescriptionPanel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('streamFeatureConfigurationPanel')).not.toBeInTheDocument();
  });

  it('hides significant events enterprise panels when enabled=true and available=undefined', () => {
    mockUseStreamsPrivileges.mockReturnValue({
      features: {
        contentPacks: { enabled: false },
        significantEvents: { enabled: true },
      },
    } as any);

    renderWithI18n(<WiredAdvancedView definition={definition} refreshDefinition={mockRefreshDefinition} />);

    expect(screen.queryByTestId('streamDescriptionPanel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('streamFeatureConfigurationPanel')).not.toBeInTheDocument();
  });

  it('shows significant events enterprise panels when enabled=true and available=true', () => {
    mockUseStreamsPrivileges.mockReturnValue({
      features: {
        contentPacks: { enabled: false },
        significantEvents: { enabled: true, available: true },
      },
    } as any);

    renderWithI18n(<WiredAdvancedView definition={definition} refreshDefinition={mockRefreshDefinition} />);

    expect(screen.getByTestId('streamDescriptionPanel')).toBeInTheDocument();
    expect(screen.getByTestId('streamFeatureConfigurationPanel')).toBeInTheDocument();
  });
});

