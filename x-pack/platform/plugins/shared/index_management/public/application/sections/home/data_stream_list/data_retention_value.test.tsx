/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import type { AppDependencies } from '../../../app_context';
import type { DataStream } from '../../../../../common/types';
import { useAppContext } from '../../../app_context';
import { useIlmLocator } from '../../../services/use_ilm_locator';
import { DataRetentionValue } from './data_retention_value';

jest.mock('../../../app_context', () => ({
  useAppContext: jest.fn(),
}));

jest.mock('../../../services/use_ilm_locator', () => ({
  useIlmLocator: jest.fn(),
}));

const mockUseAppContext = jest.mocked(useAppContext);
const mockUseIlmLocator = jest.mocked(useIlmLocator);

const createDataStream = (overrides: Partial<DataStream> = {}): DataStream => ({
  name: 'my-data-stream',
  timeStampField: { name: '@timestamp' },
  indices: [
    {
      name: 'index-000001',
      uuid: 'uuid-1',
      preferILM: false,
      managedBy: 'Data stream lifecycle',
    },
  ],
  generation: 1,
  health: 'green',
  indexTemplateName: 'my-template',
  privileges: {
    delete_index: true,
    manage_data_stream_lifecycle: true,
    read_failure_store: true,
  },
  hidden: false,
  nextGenerationManagedBy: 'Data stream lifecycle',
  lifecycle: { enabled: true, data_retention: '7d' },
  indexMode: 'standard',
  ...overrides,
});

describe('DataRetentionValue', () => {
  const navigateToUrl = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppContext.mockReturnValue({
      core: { application: { navigateToUrl } },
    } as unknown as AppDependencies);
  });

  it('renders an ILM policy link and navigates when clicked', () => {
    mockUseIlmLocator.mockReturnValue('/test/my_policy');

    const dataStream = createDataStream({
      nextGenerationManagedBy: 'Index Lifecycle Management',
      ilmPolicyName: 'my_policy',
      lifecycle: undefined,
    });

    renderWithI18n(<DataRetentionValue dataStream={dataStream} valueTestSubj="retentionValue" />);

    const link = screen.getByTestId('retentionValue');
    expect(link).toHaveTextContent('my_policy');
    expect(link).toHaveAttribute('data-href', '/test/my_policy');
    expect(screen.getByText('ILM')).toBeInTheDocument();

    fireEvent.click(link);
    expect(navigateToUrl).toHaveBeenCalledWith('/test/my_policy');
  });

  it('renders the data retention period when not ILM-managed', () => {
    mockUseIlmLocator.mockReturnValue('/test/my_policy');

    const dataStream = createDataStream({
      nextGenerationManagedBy: 'Data stream lifecycle',
      ilmPolicyName: 'my_policy',
      lifecycle: { enabled: true, data_retention: '2d' } as DataStream['lifecycle'],
    });

    renderWithI18n(<DataRetentionValue dataStream={dataStream} />);

    expect(screen.getByText('2 days')).toBeInTheDocument();
    expect(screen.queryByText('ILM')).not.toBeInTheDocument();
  });
});
