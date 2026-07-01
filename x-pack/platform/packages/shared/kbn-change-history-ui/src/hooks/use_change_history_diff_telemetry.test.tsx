/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import type { ChangeHistoryCompareSpec } from '../types/change_history_compare';
import { TEST_SNAPSHOT, TEST_SNAPSHOT_OLD } from '../test_utils/change_history_test_fixtures';
import { useChangeHistoryDiffTelemetry } from './use_change_history_diff_telemetry';
import { useChangeHistoryConfig } from '../provider/use_change_history_config';

jest.mock('../provider/use_change_history_config', () => ({
  useChangeHistoryConfig: jest.fn(),
}));

const mockUseChangeHistoryConfig = useChangeHistoryConfig as jest.Mock;

const compareSpec: ChangeHistoryCompareSpec = {
  comparisonType: 'vs_previous',
  baseline: {
    id: 'evt-5',
    timestamp: '2026-06-15T12:00:00.000Z',
    actor: { name: 'Alice' },
    action: 'Updated',
    metadata: { version: 5 },
    snapshot: TEST_SNAPSHOT_OLD,
  },
  target: {
    id: 'evt-8',
    timestamp: '2026-06-16T12:00:00.000Z',
    actor: { name: 'Alice' },
    action: 'Updated',
    isCurrent: true,
    metadata: { version: 8 },
    snapshot: TEST_SNAPSHOT,
  },
};

const mockReportDiffViewed = jest.fn();
const mockReportDiffChangeNavigated = jest.fn();

describe('useChangeHistoryDiffTelemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseChangeHistoryConfig.mockReturnValue({
      telemetry: {
        reportDiffViewed: mockReportDiffViewed,
        reportDiffChangeNavigated: mockReportDiffChangeNavigated,
      },
    });
  });

  it('reports diff viewed when the preview consumer calls reportDiffViewed', () => {
    const { result } = renderHook(() =>
      useChangeHistoryDiffTelemetry({
        compareSpec,
      })
    );

    result.current?.reportDiffViewed();

    expect(mockReportDiffViewed).toHaveBeenCalledWith({
      comparisonType: 'vs_previous',
      compareMode: 'unified',
      versionDistance: 3,
    });
  });

  it('reports hasChangesSummaryTooltip when summary renderer and data are present', () => {
    mockUseChangeHistoryConfig.mockReturnValue({
      renderChangesSummary: jest.fn(),
      telemetry: {
        reportDiffViewed: mockReportDiffViewed,
        reportDiffChangeNavigated: mockReportDiffChangeNavigated,
      },
    });

    const { result } = renderHook(() =>
      useChangeHistoryDiffTelemetry({
        compareSpec: {
          ...compareSpec,
          target: {
            ...compareSpec.target,
            changes: { count: 2, summary: [{ title: 'A', lines: ['1 added'] }] },
          },
        },
      })
    );

    result.current?.reportDiffViewed();

    expect(mockReportDiffViewed).toHaveBeenCalledWith(
      expect.objectContaining({
        hasChangesSummaryTooltip: true,
      })
    );
  });

  it('does not report diff viewed until reportDiffViewed is called', () => {
    renderHook(() =>
      useChangeHistoryDiffTelemetry({
        compareSpec,
      })
    );

    expect(mockReportDiffViewed).not.toHaveBeenCalled();
  });

  it('dedupes identical diff viewed reports', () => {
    const { result } = renderHook(() =>
      useChangeHistoryDiffTelemetry({
        compareSpec,
      })
    );

    result.current?.reportDiffViewed();
    result.current?.reportDiffViewed();

    expect(mockReportDiffViewed).toHaveBeenCalledTimes(1);
  });

  it('resets diff viewed dedupe when compareSpec key changes', () => {
    const { result, rerender } = renderHook(
      ({ spec }: { spec: ChangeHistoryCompareSpec }) =>
        useChangeHistoryDiffTelemetry({ compareSpec: spec }),
      { initialProps: { spec: compareSpec } }
    );

    result.current?.reportDiffViewed();
    expect(mockReportDiffViewed).toHaveBeenCalledTimes(1);

    rerender({
      spec: {
        ...compareSpec,
        target: {
          ...compareSpec.target,
          id: 'evt-9',
        },
      },
    });

    result.current?.reportDiffViewed();
    expect(mockReportDiffViewed).toHaveBeenCalledTimes(2);
  });

  it('does not reset diff viewed dedupe when compareSpec identity changes but key is unchanged', () => {
    const { result, rerender } = renderHook(
      ({ spec }: { spec: ChangeHistoryCompareSpec }) =>
        useChangeHistoryDiffTelemetry({ compareSpec: spec }),
      { initialProps: { spec: compareSpec } }
    );

    result.current?.reportDiffViewed();

    rerender({
      spec: {
        ...compareSpec,
        target: {
          ...compareSpec.target,
          timestamp: '2026-06-17T12:00:00.000Z',
        },
      },
    });

    result.current?.reportDiffViewed();
    expect(mockReportDiffViewed).toHaveBeenCalledTimes(1);
  });

  it('reports diff viewed again when compare mode changes after display', () => {
    const { result } = renderHook(() =>
      useChangeHistoryDiffTelemetry({
        compareSpec,
      })
    );

    result.current?.reportDiffViewed();
    expect(mockReportDiffViewed).toHaveBeenCalledTimes(1);

    act(() => {
      result.current?.setCompareMode('split');
    });

    expect(mockReportDiffViewed).toHaveBeenCalledTimes(2);
    expect(mockReportDiffViewed).toHaveBeenLastCalledWith(
      expect.objectContaining({
        compareMode: 'split',
      })
    );
  });

  it('reports vs_row comparison type from compareSpec', () => {
    const { result } = renderHook(() =>
      useChangeHistoryDiffTelemetry({
        compareSpec: {
          ...compareSpec,
          comparisonType: 'vs_row',
        },
      })
    );

    result.current?.reportDiffViewed();

    expect(mockReportDiffViewed).toHaveBeenCalledWith(
      expect.objectContaining({
        comparisonType: 'vs_row',
      })
    );
  });

  it('reports diff change navigated after diff viewed', () => {
    const { result } = renderHook(() =>
      useChangeHistoryDiffTelemetry({
        compareSpec,
      })
    );

    result.current?.reportDiffChangeNavigated('line_hunk');
    expect(mockReportDiffChangeNavigated).not.toHaveBeenCalled();

    result.current?.reportDiffViewed();
    result.current?.reportDiffChangeNavigated('line_hunk');

    expect(mockReportDiffChangeNavigated).toHaveBeenCalledWith({
      navigationSource: 'line_hunk',
    });
  });

  it('returns undefined when compareSpec is absent', () => {
    const { result } = renderHook(() => useChangeHistoryDiffTelemetry({}));

    expect(result.current).toBeUndefined();
  });
});
