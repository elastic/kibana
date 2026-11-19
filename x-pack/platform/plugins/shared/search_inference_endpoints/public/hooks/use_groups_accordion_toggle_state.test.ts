/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';

import { InferenceEndpoints } from '../__mocks__/inference_endpoints';

import { isGroupOpen, useGroupsAccordionToggleState } from './use_groups_accordion_toggle_state';
import { GroupByOptions } from '../types';

describe('useGroupsAccordionToggleState', () => {
  it('should default all groups to open', () => {
    const { result } = renderHook(() =>
      useGroupsAccordionToggleState(InferenceEndpoints, GroupByOptions.Service)
    );

    expect(isGroupOpen(result.current.groupToggleState, 'elastic')).toBe(true);
    expect(isGroupOpen(result.current.groupToggleState, 'elasticsearch')).toBe(true);
    expect(isGroupOpen(result.current.groupToggleState, 'alibabacloud-ai-search')).toBe(true);
  });

  it('should collapse all groups when collapseAll is called', () => {
    const { result } = renderHook(() =>
      useGroupsAccordionToggleState(InferenceEndpoints, GroupByOptions.Service)
    );

    act(() => {
      result.current.collapseAll();
    });

    expect(isGroupOpen(result.current.groupToggleState, 'elastic')).toBe(false);
    expect(isGroupOpen(result.current.groupToggleState, 'elasticsearch')).toBe(false);
    expect(isGroupOpen(result.current.groupToggleState, 'alibabacloud-ai-search')).toBe(false);
  });

  it('should expand all groups when expandAll is called after collapseAll', () => {
    const { result } = renderHook(() =>
      useGroupsAccordionToggleState(InferenceEndpoints, GroupByOptions.Service)
    );

    act(() => {
      result.current.collapseAll();
    });
    act(() => {
      result.current.expandAll();
    });

    expect(isGroupOpen(result.current.groupToggleState, 'elastic')).toBe(true);
    expect(isGroupOpen(result.current.groupToggleState, 'elasticsearch')).toBe(true);
  });

  it('should toggle a single group with toggleGroup', () => {
    const { result } = renderHook(() =>
      useGroupsAccordionToggleState(InferenceEndpoints, GroupByOptions.Service)
    );

    act(() => {
      result.current.toggleGroup('elastic', false);
    });

    expect(isGroupOpen(result.current.groupToggleState, 'elastic')).toBe(false);
    expect(isGroupOpen(result.current.groupToggleState, 'elasticsearch')).toBe(true);

    act(() => {
      result.current.toggleGroup('elastic', true);
    });

    expect(isGroupOpen(result.current.groupToggleState, 'elastic')).toBe(true);
  });
});
