/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

const mockUseStartServices = jest.fn();
jest.mock('./use_core', () => ({
  useStartServices: () => mockUseStartServices(),
}));

import { useAutomaticImportAuthz } from './use_automatic_import_authz';

const ALL_CAPABILITIES = { view: true, create: true, edit: true, delete: true, approve: true };
const READ_CAPABILITIES = { view: true, create: false, edit: false, delete: false, approve: false };

describe('useAutomaticImportAuthz', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('grants every action for a user with the Automatic Import "all" privilege', () => {
    mockUseStartServices.mockReturnValue({
      automaticImport: {},
      application: { capabilities: { automatic_import: ALL_CAPABILITIES } },
    });

    const { result } = renderHook(() => useAutomaticImportAuthz());

    expect(result.current).toEqual({
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canApprove: true,
    });
  });

  it('only grants view for a user with the Automatic Import "read" privilege', () => {
    mockUseStartServices.mockReturnValue({
      automaticImport: {},
      application: { capabilities: { automatic_import: READ_CAPABILITIES } },
    });

    const { result } = renderHook(() => useAutomaticImportAuthz());

    expect(result.current).toEqual({
      canView: true,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canApprove: false,
    });
  });

  it('grants nothing when the automaticImport plugin is not available', () => {
    mockUseStartServices.mockReturnValue({
      automaticImport: undefined,
      application: { capabilities: { automatic_import: ALL_CAPABILITIES } },
    });

    const { result } = renderHook(() => useAutomaticImportAuthz());

    expect(Object.values(result.current).every((value) => value === false)).toBe(true);
  });

  it('grants nothing when no automatic_import capability is registered', () => {
    mockUseStartServices.mockReturnValue({
      automaticImport: {},
      application: { capabilities: {} },
    });

    const { result } = renderHook(() => useAutomaticImportAuthz());

    expect(Object.values(result.current).every((value) => value === false)).toBe(true);
  });
});
