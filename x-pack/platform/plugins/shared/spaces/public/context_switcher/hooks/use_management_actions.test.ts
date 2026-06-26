/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import type { ApplicationStart } from '@kbn/core/public';

import { useManagementActions } from './use_management_actions';

describe('useManagementActions', () => {
  const navigateToApp = jest.fn();
  const application = { navigateToApp } as unknown as ApplicationStart;

  beforeEach(() => jest.clearAllMocks());

  it('returns headerAction and footerAction when canManageSpaces is true', () => {
    const { result } = renderHook(() =>
      useManagementActions({ application, canManageSpaces: true })
    );

    expect(result.current.headerAction).toMatchObject({
      id: 'manageSpaces',
      label: 'Manage',
    });
    expect(result.current.footerAction).toMatchObject({
      id: 'createSpace',
      label: 'Create space',
    });
  });

  it('returns empty object when canManageSpaces is false', () => {
    const { result } = renderHook(() =>
      useManagementActions({ application, canManageSpaces: false })
    );

    expect(result.current.headerAction).toBeUndefined();
    expect(result.current.footerAction).toBeUndefined();
  });

  it('headerAction navigates to spaces management', () => {
    const { result } = renderHook(() =>
      useManagementActions({ application, canManageSpaces: true })
    );

    result.current.headerAction!.onClick!();
    expect(navigateToApp).toHaveBeenCalledWith('management', { path: 'kibana/spaces' });
  });

  it('footerAction navigates to create space page', () => {
    const { result } = renderHook(() =>
      useManagementActions({ application, canManageSpaces: true })
    );
    result.current.footerAction!.onClick!();

    expect(navigateToApp).toHaveBeenCalledWith('management', { path: 'kibana/spaces/create' });
  });
});
