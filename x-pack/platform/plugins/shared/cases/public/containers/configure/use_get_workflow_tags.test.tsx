/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';
import { TestProviders } from '../../common/mock';
import { useGetWorkflowTags } from './use_get_workflow_tags';

const mockGetAggs = jest.fn();

jest.mock('@kbn/workflows-ui', () => ({
  useWorkflowsApi: () => ({ getAggs: mockGetAggs }),
}));

describe('useGetWorkflowTags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the tag keys from the workflow tags aggregation', async () => {
    mockGetAggs.mockResolvedValue({
      tags: [
        { key: 'soc-triage', label: 'soc-triage' },
        { key: 'enrichment', label: 'enrichment' },
      ],
    });

    const { result } = renderHook(() => useGetWorkflowTags({ enabled: true }), {
      wrapper: TestProviders,
    });

    await waitFor(() => expect(result.current.data).toEqual(['soc-triage', 'enrichment']));
    expect(mockGetAggs).toHaveBeenCalledWith({ fields: ['tags'] });
  });

  it('returns an empty list when the aggregation has no tags bucket', async () => {
    mockGetAggs.mockResolvedValue({});

    const { result } = renderHook(() => useGetWorkflowTags({ enabled: true }), {
      wrapper: TestProviders,
    });

    await waitFor(() => expect(result.current.data).toEqual([]));
  });

  it('does not fetch when disabled', () => {
    renderHook(() => useGetWorkflowTags({ enabled: false }), { wrapper: TestProviders });

    expect(mockGetAggs).not.toHaveBeenCalled();
  });
});
