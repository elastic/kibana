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

  it('should return empty array when timelines is undefined', () => {
    const { result } = renderHook(() =>
      useOsqueryRowActions({
        timelines: undefined,
        appName: 'Security',
        liveQueryActionId: 'action-123',
        agentIds: ['agent-1'],
        startServices: mockStartServices,
      })
    );

    expect(result.current).toEqual([]);
  });

  it('should return empty array when appName is not Security', () => {
    const { result } = renderHook(() =>
      useOsqueryRowActions({
        timelines: mockTimelines,
        appName: 'Osquery',
        liveQueryActionId: 'action-123',
        agentIds: ['agent-1'],
        startServices: mockStartServices,
      })
    );

    expect(result.current).toEqual([]);
  });

  it('should return timeline row action when in Security context', () => {
    const { result } = renderHook(() =>
      useOsqueryRowActions({
        timelines: mockTimelines,
        appName: 'Security',
        liveQueryActionId: 'action-123',
        agentIds: ['agent-1'],
        startServices: mockStartServices,
      })
    );

    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe('osquery-add-to-timeline');
  });

  it('should have proper render function for timeline action', () => {
    const { result } = renderHook(() =>
      useOsqueryRowActions({
        timelines: mockTimelines,
        appName: 'Security',
        liveQueryActionId: 'action-123',
        agentIds: ['agent-1'],
        startServices: mockStartServices,
      })
    );

    const timelineAction = result.current[0];
    expect(timelineAction.render).toBeDefined();
    expect(typeof timelineAction.render).toBe('function');
  });

  it('should memoize actions based on dependencies', () => {
    const { result, rerender } = renderHook(
      ({ timelines, appName }) =>
        useOsqueryRowActions({
          timelines,
          appName,
          liveQueryActionId: 'action-123',
          agentIds: ['agent-1'],
          startServices: mockStartServices,
        }),
      {
        initialProps: {
          timelines: mockTimelines,
          appName: 'Security',
        },
      }
    );

    const firstResult = result.current;

    rerender({
      timelines: mockTimelines,
      appName: 'Security',
    });

    expect(result.current).toBe(firstResult);
  });
});
