/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { act, render } from '@testing-library/react';
import { QuickStats } from './quick_stats';
import { useAppContext } from '../../../../../app_context';
import { loadIndexVectorCount } from '../../../../../services/api';

vi.mock('../../../../../app_context', () => {
      const mocked = {
      useAppContext: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../../services/api', () => {
      const mocked = {
      loadIndexDocCount: vi.fn().mockResolvedValue({ data: { 'test-index': 0 } }),
      loadIndexVectorCount: vi.fn().mockResolvedValue({ data: { vectorCount: 5 } }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./storage_details', () => {
      const mocked = { StorageDetails: () => null };
      return { ...mocked, default: mocked };
    });
vi.mock('./status_details', () => {
      const mocked = { StatusDetails: () => null };
      return { ...mocked, default: mocked };
    });
vi.mock('./size_doc_count_details', () => {
      const mocked = { SizeDocCountDetails: () => null };
      return { ...mocked, default: mocked };
    });
vi.mock('./aliases_details', () => {
      const mocked = { AliasesDetails: () => null };
      return { ...mocked, default: mocked };
    });
vi.mock('./data_stream_details', () => {
      const mocked = { DataStreamDetails: () => null };
      return { ...mocked, default: mocked };
    });

const mockUseAppContext = vi.mocked(useAppContext);
const mockLoadIndexVectorCount = vi.mocked(loadIndexVectorCount);

describe('QuickStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
