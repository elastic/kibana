/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useInferenceCapabilities } from './use_inference_capabilities';
import { useKibana } from './use_kibana';

jest.mock('./use_kibana');

const mockUseKibana = useKibana as jest.Mock;

const renderCapabilities = (capabilities: Record<string, unknown>) => {
  mockUseKibana.mockReturnValue({
    services: { application: { capabilities: { searchInferenceEndpoints: capabilities } } },
  });
  return renderHook(() => useInferenceCapabilities());
};

describe('useInferenceCapabilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns canManage: true when manage capability is true', () => {
    const { result } = renderCapabilities({ show: true, manage: true });
    expect(result.current.canManage).toBe(true);
  });

  it('returns canManage: false when manage capability is false', () => {
    const { result } = renderCapabilities({ show: true, manage: false });
    expect(result.current.canManage).toBe(false);
  });

  it('returns canManage: false when manage capability is missing', () => {
    const { result } = renderCapabilities({ show: true });
    expect(result.current.canManage).toBe(false);
  });

  it('returns canManage: false when searchInferenceEndpoints capabilities are missing', () => {
    mockUseKibana.mockReturnValue({
      services: { application: { capabilities: {} } },
    });
    const { result } = renderHook(() => useInferenceCapabilities());
    expect(result.current.canManage).toBe(false);
  });
});
