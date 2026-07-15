/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';

import { useAttributesFieldActions } from './use_attributes_field_actions';
import { basicCase } from '../../../../../../containers/mock';
import { TestProviders } from '../../../../../../common/mock';
import { useOnUpdateField } from '../../../../../case_view/use_on_update_field';
import type { CaseUI } from '../../../../../../../common';

jest.mock('../../../../../../common/navigation/hooks');
jest.mock('../../../../../case_view/use_on_update_field');

const onUpdateField = jest.fn();

const useOnUpdateFieldMock = useOnUpdateField as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(TestProviders, null, children);

const caseData: CaseUI = basicCase;

describe('useAttributesFieldActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useOnUpdateFieldMock.mockReturnValue({ onUpdateField, isLoading: false, loadingKey: null });
  });

  it('only calls onUpdateField for assignees when the assignee set actually changes', () => {
    const { result } = renderHook(() => useAttributesFieldActions({ caseData }), { wrapper });

    act(() => {
      result.current.onUpdateAssignees(
        caseData.assignees.map((assignee) => ({ uid: assignee.uid }))
      );
    });

    expect(onUpdateField).not.toHaveBeenCalled();

    act(() => {
      result.current.onUpdateAssignees([{ uid: 'a-new-assignee' }]);
    });

    expect(onUpdateField).toHaveBeenCalledWith({
      key: 'assignees',
      value: [{ uid: 'a-new-assignee' }],
    });
  });

  it('calls onUpdateField with the correct key for each simple field action', () => {
    const { result } = renderHook(() => useAttributesFieldActions({ caseData }), { wrapper });

    act(() => {
      result.current.onSubmitTags(['a', 'b']);
    });
    expect(onUpdateField).toHaveBeenCalledWith({ key: 'tags', value: ['a', 'b'] });

    act(() => {
      result.current.onSubmitCategory('my-category');
    });
    expect(onUpdateField).toHaveBeenCalledWith({ key: 'category', value: 'my-category' });

    act(() => {
      result.current.onUpdateSeverity('high' as never);
    });
    expect(onUpdateField).toHaveBeenCalledWith({ key: 'severity', value: 'high' });
  });

  it('derives loading flags for each attribute field from the loading key', () => {
    useOnUpdateFieldMock.mockReturnValue({
      onUpdateField,
      isLoading: true,
      loadingKey: 'severity',
    });

    const { result } = renderHook(() => useAttributesFieldActions({ caseData }), { wrapper });

    expect(result.current.isSeverityLoading).toBe(true);
    expect(result.current.isTagsLoading).toBe(false);
    expect(result.current.isCategoryLoading).toBe(false);
    expect(result.current.isAssigneeFieldLoading).toBe(false);
  });

  it('memoizes the returned object when nothing changes between renders', () => {
    const { result, rerender } = renderHook(() => useAttributesFieldActions({ caseData }), {
      wrapper,
    });

    const firstResult = result.current;
    rerender();

    expect(result.current).toBe(firstResult);
  });
});
