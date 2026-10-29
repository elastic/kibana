/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { GetKiResponse } from '../../../../../common/http_api/knowledge_indicators';
import { useKiPageHeaderMenu } from './use_ki_page_header_menu';

const ki: GetKiResponse = {
  id: 'ki-1',
  document: {
    title: 'Title',
    content: 'body',
    type: 'playbook',
  },
};

const defaultArgs = {
  ki,
  error: undefined,
  showContentEditAction: false,
  canRestore: false,
  canDelete: true,
  onStartContentEditing: jest.fn(),
  onOpenRestoreConfirm: jest.fn(),
  onOpenDeleteConfirm: jest.fn(),
  isDeleteLoading: false,
  isRestoreLoading: false,
};

describe('useKiPageHeaderMenu', () => {
  it('returns undefined when ki is missing', () => {
    const { result } = renderHook(() =>
      useKiPageHeaderMenu({
        ...defaultArgs,
        ki: undefined,
      })
    );

    expect(result.current).toBeUndefined();
  });

  it('exposes delete as primary action when canDelete and edit is not shown', () => {
    const { result } = renderHook(() => useKiPageHeaderMenu(defaultArgs));

    expect(result.current?.primaryActionItem?.id).toBe('delete');
  });

  it('exposes restore as primary action when canRestore', () => {
    const { result } = renderHook(() =>
      useKiPageHeaderMenu({
        ...defaultArgs,
        canDelete: false,
        canRestore: true,
      })
    );

    expect(result.current?.primaryActionItem?.id).toBe('restore');
  });

  it('exposes edit as primary and delete in overflow when showContentEditAction', () => {
    const { result } = renderHook(() =>
      useKiPageHeaderMenu({
        ...defaultArgs,
        showContentEditAction: true,
      })
    );

    expect(result.current?.primaryActionItem?.id).toBe('editContent');
    expect(result.current?.items?.[0]?.id).toBe('delete');
    expect(result.current?.items?.[0]?.isDestructive).toBe(true);
  });
});
