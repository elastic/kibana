/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { AppHeaderTab } from '@kbn/app-header';
import { useStreamsAppParams } from '../../hooks/use_streams_app_params';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { CLASSIC_TAB_ORIGIN_KEY } from '../../hooks/use_streams_home_link';
import { useStreamsPrivileges } from '../../hooks/use_streams_privileges';
import { useTimeRange } from '../../hooks/use_time_range';
import { useShowClassicTab } from './use_show_classic_tab';
import { useUnitCheck, type UnitCheck } from './use_unit_check';
import { StreamsLayout, StreamsV2LayoutGate } from '.';

const mockTabMounted = jest.fn();
const mockHeaderProps = jest.fn();

jest.mock('../../hooks/use_streams_app_params', () => ({ useStreamsAppParams: jest.fn() }));
jest.mock('../../hooks/use_streams_app_router', () => ({ useStreamsAppRouter: jest.fn() }));
jest.mock('../../hooks/use_streams_privileges', () => ({ useStreamsPrivileges: jest.fn() }));
jest.mock('../../hooks/use_time_range', () => ({ useTimeRange: jest.fn() }));
jest.mock('./use_unit_check', () => ({ useUnitCheck: jest.fn() }));
jest.mock('./use_show_classic_tab', () => ({ useShowClassicTab: jest.fn() }));
jest.mock('./unit_not_found_prompt', () => ({
  UnitNotFoundPrompt: ({ unitId }: { unitId: string }) => (
    <div data-test-subj="streamsUnitNotFoundPrompt">{unitId}</div>
  ),
}));
jest.mock('../redirect_to', () => ({
  RedirectTo: ({ path, params }: { path: string; params?: unknown }) => (
    <div data-test-subj="redirectTo" data-path={path} data-params={JSON.stringify(params)} />
  ),
}));
jest.mock('./tabs', () => {
  const { useEffect } = jest.requireActual('react');
  const createTab = (id: string) => ({
    label: id,
    techPreview: true,
    Component: () => {
      useEffect(() => {
        mockTabMounted(id);
      }, []);
      return <div data-test-subj={`streamsLayoutTabContent-${id}`} />;
    },
  });
  return {
    streamsLayoutTabs: {
      map: createTab('map'),
      sources: createTab('sources'),
      destinations: createTab('destinations'),
      classic: {
        label: 'classic',
        ownsHeader: true,
        Component: ({ tabs }: { tabs?: AppHeaderTab[] }) => (
          <div data-test-subj="streamsLayoutTabContent-classic">{tabs?.length}</div>
        ),
      },
    },
  };
});
jest.mock('../streams_app_page_template', () => ({
  StreamsAppHeader: (props: { tabs?: AppHeaderTab[] }) => {
    mockHeaderProps(props);
    return <div data-test-subj="streamsLayoutHeader">{props.tabs?.length ?? 0}</div>;
  },
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
  legacy = true,
  showClassic = true,
  loading = false,
}: {
  unitId?: string;
  tab?: string;
  check?: UnitCheck;
  v2?: boolean;
  legacy?: boolean;
  showClassic?: boolean;
  loading?: boolean;
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
    access: { v2, legacy },
  } as unknown as ReturnType<typeof useStreamsPrivileges>);
  jest.mocked(useUnitCheck).mockReturnValue(check);
  jest.mocked(useShowClassicTab).mockReturnValue({ loading, showClassic });
  return { showClassic };
};

const renderLayout = (options: Parameters<typeof setup>[0]) =>
  render(<StreamsLayout showClassic={setup(options).showClassic} />);

describe('StreamsLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('redirects to / without V2 access', () => {
    renderLayout({ v2: false });

    expect(screen.getByTestId('redirectTo')).toHaveAttribute('data-path', '/');
  });

  it('shows a spinner and no tabs while the unit is checked', () => {
    renderLayout({ check: 'checking' });

    expect(screen.getByTestId('streamsUnitCheckLoading')).toBeInTheDocument();
    expect(screen.getByTestId('streamsLayoutHeader')).toHaveTextContent('0');
    expect(screen.queryByTestId('streamsLayoutTabContent-sources')).not.toBeInTheDocument();
  });

  it('shows the not-found prompt and no tabs for a missing unit', () => {
    renderLayout({ check: 'notFound', unitId: 'edge' });

    expect(screen.getByTestId('streamsUnitNotFoundPrompt')).toHaveTextContent('edge');
    expect(screen.getByTestId('streamsLayoutHeader')).toHaveTextContent('0');
    expect(screen.queryByTestId('streamsLayoutTabContent-sources')).not.toBeInTheDocument();
  });

  it('redirects an unknown tab of a missing unit to the map', () => {
    renderLayout({ check: 'notFound', tab: 'bogus' });

    expect(screen.getByTestId('redirectTo')).toHaveAttribute(
      'data-params',
      JSON.stringify({ path: { tab: 'map' } })
    );
    expect(screen.queryByTestId('streamsUnitNotFoundPrompt')).not.toBeInTheDocument();
  });

  it('renders the classic tab with its own header and without a unit check', () => {
    renderLayout({ tab: 'classic', check: 'checking' });

    expect(screen.getByTestId('streamsLayoutTabContent-classic')).toHaveTextContent('4');
    expect(screen.queryByTestId('streamsLayoutHeader')).not.toBeInTheDocument();
    expect(screen.queryByTestId('streamsUnitCheckLoading')).not.toBeInTheDocument();
  });

  it('remembers the Classic tab as the return target', () => {
    renderLayout({ tab: 'classic' });

    expect(sessionStorage.getItem(CLASSIC_TAB_ORIGIN_KEY)).toBe('edge');
  });

  it('forgets the Classic tab when another layout tab is open', () => {
    sessionStorage.setItem(CLASSIC_TAB_ORIGIN_KEY, 'edge');
    renderLayout({ tab: 'map' });

    expect(sessionStorage.getItem(CLASSIC_TAB_ORIGIN_KEY)).toBeNull();
  });

  it('hides the classic tab when the stream check finds none', () => {
    renderLayout({ tab: 'map', showClassic: false });

    expect(screen.getByTestId('streamsLayoutHeader')).toHaveTextContent('3');
  });

  it('keeps the classic tab reachable by URL when the stream check finds none', () => {
    renderLayout({ tab: 'classic', showClassic: false });

    expect(screen.getByTestId('streamsLayoutTabContent-classic')).toHaveTextContent('4');
    expect(screen.queryByTestId('redirectTo')).not.toBeInTheDocument();
  });

  it('redirects the classic tab to the map without Streams access', () => {
    renderLayout({ tab: 'classic', showClassic: false, legacy: false });

    expect(screen.getByTestId('redirectTo')).toHaveAttribute(
      'data-params',
      JSON.stringify({ path: { tab: 'map' } })
    );
    expect(screen.queryByTestId('streamsLayoutTabContent-classic')).not.toBeInTheDocument();
  });

  it('marks only the new tabs as technical preview', () => {
    renderLayout({ tab: 'map' });

    const { tabs } = mockHeaderProps.mock.calls.at(-1)[0] as { tabs: AppHeaderTab[] };
    const badges = Object.fromEntries(tabs.map(({ id, badge }) => [id, badge]));
    const techPreviewBadge = { iconType: 'flask', tooltip: 'Technical preview' };

    expect(badges).toEqual({
      map: techPreviewBadge,
      sources: techPreviewBadge,
      destinations: techPreviewBadge,
      classic: undefined,
    });
  });

  it('renders the tab and unit scoped tab links for a found unit', () => {
    renderLayout({ unitId: 'edge', tab: 'sources' });

    expect(screen.getByTestId('streamsLayoutTabContent-sources')).toBeInTheDocument();
    expect(screen.getByTestId('streamsLayoutHeader')).toHaveTextContent('4');
    expect(link).toHaveBeenCalledWith(
      '/v2/unit/{unitId}/{tab}',
      expect.objectContaining({ path: { unitId: 'edge', tab: 'map' } })
    );
  });

  it('remounts the tab when the unit changes', () => {
    setup({ unitId: 'edge', tab: 'sources' });
    const { rerender } = render(<StreamsLayout showClassic />);
    setup({ unitId: 'default', tab: 'sources' });
    rerender(<StreamsLayout showClassic />);

    expect(mockTabMounted).toHaveBeenCalledTimes(2);
  });
});

describe('StreamsV2LayoutGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('waits for the stream check before rendering any tab', () => {
    setup({ tab: 'map', loading: true });
    render(<StreamsV2LayoutGate />);

    expect(screen.getByTestId('streamsClassicTabLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('streamsLayoutHeader')).not.toBeInTheDocument();
    expect(screen.queryByTestId('streamsLayoutTabContent-map')).not.toBeInTheDocument();
  });

  it.each([
    [true, '4'],
    [false, '3'],
  ])('renders the layout with the settled answer (showClassic %s)', (showClassic, tabCount) => {
    setup({ tab: 'map', showClassic });
    render(<StreamsV2LayoutGate />);

    expect(screen.getByTestId('streamsLayoutHeader')).toHaveTextContent(tabCount);
    expect(screen.getByTestId('streamsLayoutTabContent-map')).toBeInTheDocument();
  });
});
