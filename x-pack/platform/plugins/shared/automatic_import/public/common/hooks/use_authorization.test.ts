/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

const mockCapabilities = jest.fn();
jest.mock('./use_kibana', () => ({
  useKibana: () => ({
    services: { application: { capabilities: mockCapabilities() } },
  }),
}));

import { useAuthorization } from './use_authorization';

describe('useAuthorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('grants integration create and edit for the Automatic Import "all" privilege', () => {
    mockCapabilities.mockReturnValue({
      actions: { save: true },
      automatic_import: { view: true, create: true, edit: true, delete: true, approve: true },
    });

    const { result } = renderHook(() => useAuthorization());

    expect(result.current).toEqual({
      canCreateConnectors: true,
      canViewIntegrations: true,
      canCreateIntegration: true,
      canEditIntegration: true,
      canDeleteIntegration: true,
      canApproveIntegration: true,
    });
  });

  it('only grants view for the Automatic Import "read" privilege', () => {
    mockCapabilities.mockReturnValue({
      automatic_import: { view: true, create: false, edit: false, delete: false, approve: false },
    });

    const { result } = renderHook(() => useAuthorization());

    expect(result.current).toEqual({
      canCreateConnectors: false,
      canViewIntegrations: true,
      canCreateIntegration: false,
      canEditIntegration: false,
      canDeleteIntegration: false,
      canApproveIntegration: false,
    });
  });

  it('grants no integration action when the automatic_import capability is missing', () => {
    mockCapabilities.mockReturnValue({});

    const { result } = renderHook(() => useAuthorization());

    expect(result.current.canViewIntegrations).toBe(false);
    expect(result.current.canCreateIntegration).toBe(false);
    expect(result.current.canEditIntegration).toBe(false);
  });
});
