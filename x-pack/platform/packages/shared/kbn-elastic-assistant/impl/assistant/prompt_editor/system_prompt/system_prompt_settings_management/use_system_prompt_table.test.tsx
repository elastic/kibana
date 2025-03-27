/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useSystemPromptTable } from './use_system_prompt_table';

describe('useSystemPromptTable', () => {
  const { result } = renderHook(() => useSystemPromptTable());

  it('should return columns with correct render functions', () => {
    const onEditActionClicked = jest.fn();
    const onDeleteActionClicked = jest.fn();
    const columns = result.current.getColumns({
      isActionsDisabled: false,
      isDeleteEnabled: jest.fn(),
      isEditEnabled: jest.fn(),
      onEditActionClicked,
      onDeleteActionClicked,
    });

    expect(columns).toHaveLength(4);
    expect(columns[0].name).toBe('Name');
    expect(columns[1].name).toBe('Default conversations');
    expect(columns[2].name).toBe('Date updated');
    expect(columns[3].name).toBe('Actions');
  });
});
