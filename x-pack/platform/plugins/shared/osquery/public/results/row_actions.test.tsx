/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import React from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { DataView } from '@kbn/data-plugin/common';
import { useOsqueryTrailingColumns, RowActionsPopover } from './row_actions';
import type { OsqueryTimelinesStart } from '../types';
import { useKibana } from '../common/lib/kibana';

jest.mock('../common/lib/kibana');
jest.mock('../cases/add_to_cases', () => {
  const { createElement } = require('react');

  return {
    AddToCaseWrapper: () =>
      createElement('div', { 'data-test-subj': 'mock-case-wrapper' }, 'Add to Case'),
  };
});

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

const mockRecord: DataTableRecord = {
  id: 'doc-1',
  raw: { _id: 'doc-1', _index: 'logs-osquery', _source: {} },
  flattened: {},
} as unknown as DataTableRecord;

const ButtonControlComponent: React.FC<{
  iconType: string;
  label: string;
  onClick: () => void;
  'data-test-subj'?: string;
}> = ({ label, onClick, ...rest }) => (
  <button onClick={onClick} aria-label={label} {...rest}>
    {label}
  </button>
);

const mockLogsDataView = {
  id: 'logs-dv-id',
  title: 'logs-osquery_manager.result*',
} as unknown as DataView;

const defaultPopoverProps = {
  Control: ButtonControlComponent,
  record: mockRecord,
  actionId: 'action-123',
  endDate: undefined as string | undefined,
  startDate: undefined as string | undefined,
  timelines: undefined as OsqueryTimelinesStart | undefined,
  appName: 'Osquery',
  liveQueryActionId: undefined as string | undefined,
  agentIds: ['agent-1'] as string[] | undefined,
  startServices: { analytics: {}, i18n: {}, theme: {} },
  logsDataView: mockLogsDataView,
  discoverUrl: 'http://discover-url',
};

describe('useOsqueryTrailingColumns', () => {
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

  const mockRows: DataTableRecord[] = [];

  const defaultProps = {
    timelines: undefined as OsqueryTimelinesStart | undefined,
    appName: 'Osquery',
    liveQueryActionId: undefined as string | undefined,
    agentIds: ['agent-1'] as string[] | undefined,
    actionId: 'action-123',
    endDate: undefined as string | undefined,
    startDate: undefined as string | undefined,
    startServices: mockStartServices,
    rows: mockRows,
    logsDataView: undefined as DataView | undefined,
    discoverUrl: '',
  };

  it('should always return one trailing control column for the actions popover', () => {
    const { result } = renderHook(() => useOsqueryTrailingColumns(defaultProps));

    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe('osquery-trailing-actions');
  });

  it('should return a rowCellRender function for the popover', () => {
    const { result } = renderHook(() => useOsqueryTrailingColumns(defaultProps));

    const actionColumn = result.current[0];
    expect(actionColumn.rowCellRender).toBeDefined();
    expect(typeof actionColumn.rowCellRender).toBe('function');
  });

  it('should return the trailing column regardless of timelines availability', () => {
    const { result: withoutTimelines } = renderHook(() =>
      useOsqueryTrailingColumns({ ...defaultProps, timelines: undefined })
    );

    const { result: withTimelines } = renderHook(() =>
      useOsqueryTrailingColumns({
        ...defaultProps,
        timelines: mockTimelines,
        appName: 'Security',
      })
    );

    expect(withoutTimelines.current).toHaveLength(1);
    expect(withTimelines.current).toHaveLength(1);
    expect(withoutTimelines.current[0].id).toBe('osquery-trailing-actions');
    expect(withTimelines.current[0].id).toBe('osquery-trailing-actions');
  });

  it('should memoize the result based on dependencies', () => {
    const { result, rerender } = renderHook((props) => useOsqueryTrailingColumns(props), {
      initialProps: defaultProps,
    });

    const firstResult = result.current;

    rerender(defaultProps);

    expect(result.current).toBe(firstResult);
  });

  it('should return new reference when actionId changes', () => {
    const { result, rerender } = renderHook((props) => useOsqueryTrailingColumns(props), {
      initialProps: defaultProps,
    });

    const firstResult = result.current;

    rerender({ ...defaultProps, actionId: 'action-456' });

    expect(result.current).not.toBe(firstResult);
  });
});

describe('RowActionsPopover', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock.mockReturnValue({
      services: {
        application: {
          capabilities: {
            discover_v2: { show: true },
          },
        },
        lens: { canUseEditor: jest.fn().mockReturnValue(true) },
        notifications: { toasts: { addSuccess: jest.fn() } },
      },
    } as unknown as ReturnType<typeof useKibana>);
  });

  it('shows View in Discover when user has discover permissions', () => {
    render(React.createElement(RowActionsPopover, defaultPopoverProps));

    fireEvent.click(screen.getByLabelText('Actions'));

    expect(screen.getByTestId('osquery-row-action-discover')).toBeInTheDocument();
  });

  it('hides View in Discover when user lacks permissions', () => {
    useKibanaMock.mockReturnValue({
      services: {
        application: {
          capabilities: {
            discover_v2: { show: false },
          },
        },
        lens: { canUseEditor: jest.fn().mockReturnValue(true) },
        notifications: { toasts: { addSuccess: jest.fn() } },
      },
    } as unknown as ReturnType<typeof useKibana>);

    render(React.createElement(RowActionsPopover, defaultPopoverProps));

    fireEvent.click(screen.getByLabelText('Actions'));

    expect(screen.queryByTestId('osquery-row-action-discover')).not.toBeInTheDocument();
  });

  it('shows View in Lens when lens is available', () => {
    render(React.createElement(RowActionsPopover, defaultPopoverProps));

    fireEvent.click(screen.getByLabelText('Actions'));

    expect(screen.getByTestId('osquery-row-action-lens')).toBeInTheDocument();
  });

  it('hides View in Lens when lens is not available', () => {
    useKibanaMock.mockReturnValue({
      services: {
        application: {
          capabilities: {
            discover_v2: { show: true },
          },
        },
        lens: { canUseEditor: jest.fn().mockReturnValue(false) },
        notifications: { toasts: { addSuccess: jest.fn() } },
      },
    } as unknown as ReturnType<typeof useKibana>);

    render(React.createElement(RowActionsPopover, defaultPopoverProps));

    fireEvent.click(screen.getByLabelText('Actions'));

    expect(screen.queryByTestId('osquery-row-action-lens')).not.toBeInTheDocument();
  });

  it('shows Add to Timeline in Security app context', () => {
    const mockTimelines: OsqueryTimelinesStart = {
      getHoverActions: jest.fn().mockReturnValue({
        getAddToTimelineButton: jest.fn().mockReturnValue(null),
      }),
    };

    render(
      React.createElement(RowActionsPopover, {
        ...defaultPopoverProps,
        timelines: mockTimelines,
        appName: 'Security',
      })
    );

    fireEvent.click(screen.getByLabelText('Actions'));

    expect(screen.getByTestId('osquery-row-action-timeline')).toBeInTheDocument();
  });

  it('hides Add to Timeline outside Security app', () => {
    const mockTimelines: OsqueryTimelinesStart = {
      getHoverActions: jest.fn().mockReturnValue({
        getAddToTimelineButton: jest.fn().mockReturnValue(null),
      }),
    };

    render(
      React.createElement(RowActionsPopover, {
        ...defaultPopoverProps,
        timelines: mockTimelines,
        appName: 'Osquery',
      })
    );

    fireEvent.click(screen.getByLabelText('Actions'));

    expect(screen.queryByTestId('osquery-row-action-timeline')).not.toBeInTheDocument();
  });

  it('shows Add to Case when liveQueryActionId is provided', () => {
    render(
      React.createElement(RowActionsPopover, {
        ...defaultPopoverProps,
        liveQueryActionId: 'live-action-1',
      })
    );

    fireEvent.click(screen.getByLabelText('Actions'));

    expect(screen.getByTestId('osquery-row-action-case')).toBeInTheDocument();
  });

  it('hides Add to Case when liveQueryActionId is undefined', () => {
    render(
      React.createElement(RowActionsPopover, {
        ...defaultPopoverProps,
        liveQueryActionId: undefined,
      })
    );

    fireEvent.click(screen.getByLabelText('Actions'));

    expect(screen.queryByTestId('osquery-row-action-case')).not.toBeInTheDocument();
  });

  it('always shows Copy ID', () => {
    render(React.createElement(RowActionsPopover, defaultPopoverProps));

    fireEvent.click(screen.getByLabelText('Actions'));

    expect(screen.getByTestId('osquery-row-action-copy-id')).toBeInTheDocument();
  });

  it('copies action ID to clipboard when Copy ID is clicked', async () => {
    const writeTextMock = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    const mockToasts = { addSuccess: jest.fn() };
    useKibanaMock.mockReturnValue({
      services: {
        application: {
          capabilities: { discover_v2: { show: true } },
        },
        lens: { canUseEditor: jest.fn().mockReturnValue(true) },
        notifications: { toasts: mockToasts },
      },
    } as unknown as ReturnType<typeof useKibana>);

    render(React.createElement(RowActionsPopover, defaultPopoverProps));

    fireEvent.click(screen.getByLabelText('Actions'));
    fireEvent.click(screen.getByTestId('osquery-row-action-copy-id'));

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith('action-123');
    });

    expect(mockToasts.addSuccess).toHaveBeenCalled();
  });
});
