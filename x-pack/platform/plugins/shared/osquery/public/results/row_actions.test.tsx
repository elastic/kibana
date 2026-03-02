/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useOsqueryRowActions } from './row_actions';
import type { OsqueryTimelinesStart } from '../types';

describe('useOsqueryRowActions', () => {
  const mockStartServices = {
    analytics: {},
    i18n: {},
    theme: {},
  };

  const mockTimelines: OsqueryTimelinesStart = {
    getHoverActions: jest.fn().mockReturnValue({
      getAddToTimelineButton: jest.fn().mockReturnValue(null),
    }),
  };

  const defaultProps = {
    timelines: undefined as OsqueryTimelinesStart | undefined,
    appName: 'Osquery',
    liveQueryActionId: undefined as string | undefined,
    agentIds: ['agent-1'] as string[] | undefined,
    actionId: 'action-123',
    endDate: undefined as string | undefined,
    startDate: undefined as string | undefined,
    startServices: mockStartServices,
  };

  it('should always return one row control column for the actions popover', () => {
    const { result } = renderHook(() => useOsqueryRowActions(defaultProps));

    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe('osquery-row-actions');
  });

  it('should return a render function for the popover', () => {
    const { result } = renderHook(() => useOsqueryRowActions(defaultProps));

    const actionColumn = result.current[0];
    expect(actionColumn.render).toBeDefined();
    expect(typeof actionColumn.render).toBe('function');
  });

  it('should return the popover regardless of timelines availability', () => {
    const { result: withoutTimelines } = renderHook(() =>
      useOsqueryRowActions({ ...defaultProps, timelines: undefined })
    );

    const { result: withTimelines } = renderHook(() =>
      useOsqueryRowActions({ ...defaultProps, timelines: mockTimelines, appName: 'Security' })
    );

    expect(withoutTimelines.current).toHaveLength(1);
    expect(withTimelines.current).toHaveLength(1);
    expect(withoutTimelines.current[0].id).toBe('osquery-row-actions');
    expect(withTimelines.current[0].id).toBe('osquery-row-actions');
  });

  it('should memoize the result based on dependencies', () => {
    const { result, rerender } = renderHook(
      (props) => useOsqueryRowActions(props),
      { initialProps: defaultProps }
    );

    const firstResult = result.current;

    rerender(defaultProps);

    expect(result.current).toBe(firstResult);
  });

  it('should return new reference when actionId changes', () => {
    const { result, rerender } = renderHook(
      (props) => useOsqueryRowActions(props),
      { initialProps: defaultProps }
    );

    const firstResult = result.current;

    rerender({ ...defaultProps, actionId: 'action-456' });

    expect(result.current).not.toBe(firstResult);
  });
});
