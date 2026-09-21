/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import { QuickStats } from './quick_stats';
import { useAppContext } from '../../../../../app_context';
import { loadIndexVectorCount } from '../../../../../services/api';

jest.mock('../../../../../app_context', () => ({
  useAppContext: jest.fn(),
}));

jest.mock('../../../../../services/api', () => ({
  loadIndexDocCount: jest.fn().mockResolvedValue({ data: { 'test-index': 0 } }),
  loadIndexVectorCount: jest.fn().mockResolvedValue({ data: { vectorCount: 5 } }),
}));

jest.mock('./storage_details', () => ({ StorageDetails: () => null }));
jest.mock('./status_details', () => ({ StatusDetails: () => null }));
jest.mock('./size_doc_count_details', () => ({ SizeDocCountDetails: () => null }));
jest.mock('./aliases_details', () => ({ AliasesDetails: () => null }));
jest.mock('./data_stream_details', () => ({ DataStreamDetails: () => null }));

const mockUseAppContext = jest.mocked(useAppContext);
const mockLoadIndexVectorCount = jest.mocked(loadIndexVectorCount);

describe('QuickStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppContext.mockReturnValue({
      config: { enableSizeAndDocCount: true, enableVectorCount: true },
    } as ReturnType<typeof useAppContext>);
  });

  it('does not call loadIndexVectorCount when enableVectorCount is disabled', async () => {
    mockUseAppContext.mockReturnValue({
      config: { enableSizeAndDocCount: true, enableVectorCount: false },
    } as ReturnType<typeof useAppContext>);

    await act(async () => {
      render(<QuickStats indexDetails={{ name: 'test-index' }} />);
    });

    expect(mockLoadIndexVectorCount).not.toHaveBeenCalled();
  });
});
