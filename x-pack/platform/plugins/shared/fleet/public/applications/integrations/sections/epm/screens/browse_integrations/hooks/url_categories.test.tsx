/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useHistory, useLocation } from 'react-router-dom';

import { useSetUrlCategory, useSetUrlDefaultCategories } from './url_categories';

jest.mock('react-router-dom', () => ({
  useHistory: jest.fn(),
  useLocation: jest.fn(),
  useParams: jest.fn(() => ({})),
}));

describe('url category writers', () => {
  const mockPush = jest.fn();
  const mockReplace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useHistory as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });
    (useLocation as jest.Mock).mockReturnValue({
      search: '?returnAppId=observabilityOnboarding&returnPath=%3F',
    });
  });

  it('keeps return params when setting a category', () => {
    const { result } = renderHook(() => useSetUrlCategory());
    act(() => {
      result.current({ category: 'observability' });
    });
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('returnAppId=observabilityOnboarding')
    );
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('returnPath'));
  });

  it('keeps return params when setting default categories', () => {
    const { result } = renderHook(() => useSetUrlDefaultCategories());
    act(() => {
      result.current(['observability', 'opentelemetry']);
    });
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('returnAppId=observabilityOnboarding')
    );
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('returnPath'));
  });
});
