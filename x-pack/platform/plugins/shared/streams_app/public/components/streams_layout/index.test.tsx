/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { useStreamsAppParams } from '../../hooks/use_streams_app_params';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useStreamsPrivileges } from '../../hooks/use_streams_privileges';
import { useTimeRange } from '../../hooks/use_time_range';
import { useUnitCheck, type UnitCheck } from './use_unit_check';
import { StreamsLayout } from '.';

const mockTabMounted = jest.fn();

jest.mock('../../hooks/use_streams_app_params', () => ({ useStreamsAppParams: jest.fn() }));
jest.mock('../../hooks/use_streams_app_router', () => ({ useStreamsAppRouter: jest.fn() }));
jest.mock('../../hooks/use_streams_privileges', () => ({ useStreamsPrivileges: jest.fn() }));
jest.mock('../../hooks/use_time_range', () => ({ useTimeRange: jest.fn() }));
jest.mock('./use_unit_check', () => ({ useUnitCheck: jest.fn() }));
jest.mock('./unit_not_found_prompt', () => ({
  UnitNotFoundPrompt: ({ unitId }: { unitId: string }) => (
    <div data-test-subj="streamsUnitNotFoundPrompt">{unitId}</div>
  ),
}));
jest.mock('../redirect_to', () => ({
  RedirectTo: ({ path }: { path: string }) => <div data-test-subj="redirectTo" data-path={path} />,
}));
jest.mock('./tabs', () => {
  const { useEffect } = jest.requireActual('react');
  const tabIds = ['map', 'sources', 'destinations'];
  const createTab = (id: string) => ({
    label: id,
    Component: () => {
      useEffect(() => {
        mockTabMounted(id);
      }, []);
      return <div data-test-subj={`streamsLayoutTabContent-${id}`} />;
    },
  });
  return {
    STREAMS_LAYOUT_TABS: tabIds,
    DEFAULT_STREAMS_LAYOUT_TAB: 'map',
    isStreamsLayoutTab: (value: string) => tabIds.includes(value),
    streamsLayoutTabs: Object.fromEntries(tabIds.map((id) => [id, createTab(id)])),
  };
});
jest.mock('../streams_app_page_template', () => ({
  StreamsAppHeader: ({ tabs }: { tabs?: unknown[] }) => (
    <div data-test-subj="streamsLayoutHeader">{tabs?.length ?? 0}</div>
  ),
  StreamsAppPageTemplate: {
    Body: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    EmptyPrompt: ({
      icon,
      'data-test-subj': dataTestSubj,
    }: {
      icon?: React.ReactNode;
      'data-test-subj'?: string;
    }) => <div data-test-subj={dataTestSubj}>{icon}</div>,
  },
}));

const link = jest.fn((path: string, params: unknown) => JSON.stringify({ path, params }));

const setup = ({
  unitId = 'edge',
  tab = 'sources',
  check = 'ready',
  v2 = true,
}: {
  unitId?: string;
  tab?: string;
  check?: UnitCheck;
  v2?: boolean;
}) => {
  jest
    .mocked(useStreamsAppParams)
    .mockReturnValue({ path: { unitId, tab } } as ReturnType<typeof useStreamsAppParams>);
  jest
    .mocked(useStreamsAppRouter)
    .mockReturnValue({ link } as unknown as ReturnType<typeof useStreamsAppRouter>);
  jest
    .mocked(useTimeRange)
    .mockReturnValue({ rangeFrom: 'now-15m', rangeTo: 'now' } as ReturnType<typeof useTimeRange>);
  jest.mocked(useStreamsPrivileges).mockReturnValue({
    access: { v2 },
  } as unknown as ReturnType<typeof useStreamsPrivileges>);
  jest.mocked(useUnitCheck).mockReturnValue(check);
};

describe('StreamsLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to / without V2 access', () => {
    setup({ v2: false });
    render(<StreamsLayout />);

    expect(screen.getByTestId('redirectTo')).toHaveAttribute('data-path', '/');
  });

  it('shows a spinner and no tabs while the unit is checked', () => {
    setup({ check: 'checking' });
    render(<StreamsLayout />);

    expect(screen.getByTestId('streamsUnitCheckLoading')).toBeInTheDocument();
    expect(screen.getByTestId('streamsLayoutHeader')).toHaveTextContent('0');
    expect(screen.queryByTestId('streamsLayoutTabContent-sources')).not.toBeInTheDocument();
  });

  it('shows the not-found prompt and no tabs for a missing unit', () => {
    setup({ check: 'notFound', unitId: 'edge' });
    render(<StreamsLayout />);

    expect(screen.getByTestId('streamsUnitNotFoundPrompt')).toHaveTextContent('edge');
    expect(screen.getByTestId('streamsLayoutHeader')).toHaveTextContent('0');
    expect(screen.queryByTestId('streamsLayoutTabContent-sources')).not.toBeInTheDocument();
  });

  it('shows not found instead of redirecting an unknown tab of a missing unit', () => {
    setup({ check: 'notFound', tab: 'bogus' });
    render(<StreamsLayout />);

    expect(screen.getByTestId('streamsUnitNotFoundPrompt')).toBeInTheDocument();
    expect(screen.queryByTestId('redirectTo')).not.toBeInTheDocument();
  });

  it('renders the tab and unit scoped tab links for a found unit', () => {
    setup({ unitId: 'edge', tab: 'sources' });
    render(<StreamsLayout />);

    expect(screen.getByTestId('streamsLayoutTabContent-sources')).toBeInTheDocument();
    expect(screen.getByTestId('streamsLayoutHeader')).toHaveTextContent('3');
    expect(link).toHaveBeenCalledWith(
      '/v2/unit/{unitId}/{tab}',
      expect.objectContaining({ path: { unitId: 'edge', tab: 'map' } })
    );
  });

  it('remounts the tab when the unit changes', () => {
    setup({ unitId: 'edge', tab: 'sources' });
    const { rerender } = render(<StreamsLayout />);
    setup({ unitId: 'default', tab: 'sources' });
    rerender(<StreamsLayout />);

    expect(mockTabMounted).toHaveBeenCalledTimes(2);
  });
});
