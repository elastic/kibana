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
import { useStreamsPrivileges } from '../../hooks/use_streams_privileges';
import { useTimeRange } from '../../hooks/use_time_range';
import { useShowClassicTab } from './use_show_classic_tab';
import { useUnitCheck, type UnitCheck } from './use_unit_check';
import { CLASSIC_TAB_ORIGIN_KEY } from './use_streams_list_link';
import { StreamsLayout } from '.';

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
  showClassic = true,
  loading = false,
}: {
  unitId?: string;
  tab?: string;
  check?: UnitCheck;
  v2?: boolean;
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
    access: { v2 },
  } as unknown as ReturnType<typeof useStreamsPrivileges>);
  jest.mocked(useUnitCheck).mockReturnValue(check);
  jest.mocked(useShowClassicTab).mockReturnValue({ loading, showClassic });
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

  it('redirects an unknown tab of a missing unit to the map', () => {
    setup({ check: 'notFound', tab: 'bogus' });
    render(<StreamsLayout />);

    expect(screen.getByTestId('redirectTo')).toHaveAttribute(
      'data-params',
      JSON.stringify({ path: { tab: 'map' } })
    );
    expect(screen.queryByTestId('streamsUnitNotFoundPrompt')).not.toBeInTheDocument();
  });

  it('renders the classic tab with its own header and without a unit check', () => {
    setup({ tab: 'classic', check: 'checking' });
    render(<StreamsLayout />);

    expect(screen.getByTestId('streamsLayoutTabContent-classic')).toHaveTextContent('4');
    expect(screen.queryByTestId('streamsLayoutHeader')).not.toBeInTheDocument();
    expect(screen.queryByTestId('streamsUnitCheckLoading')).not.toBeInTheDocument();
  });

  it('hides the classic tab when the stream check finds none', () => {
    setup({ tab: 'map', showClassic: false });
    render(<StreamsLayout />);

    expect(screen.getByTestId('streamsLayoutHeader')).toHaveTextContent('3');
  });

  it('redirects the classic tab to the map when the stream check finds none', () => {
    setup({ tab: 'classic', showClassic: false });
    render(<StreamsLayout />);

    expect(screen.getByTestId('redirectTo')).toHaveAttribute(
      'data-params',
      JSON.stringify({ path: { tab: 'map' } })
    );
    expect(screen.queryByTestId('streamsLayoutTabContent-classic')).not.toBeInTheDocument();
  });

  it('waits for the stream check before rendering the classic tab', () => {
    setup({ tab: 'classic', loading: true, showClassic: true });
    render(<StreamsLayout />);

    expect(screen.getByTestId('streamsClassicTabLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('streamsLayoutTabContent-classic')).not.toBeInTheDocument();
  });

  it('marks only the new tabs as technical preview', () => {
    setup({ tab: 'map' });
    render(<StreamsLayout />);

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
    setup({ unitId: 'edge', tab: 'sources' });
    render(<StreamsLayout />);

    expect(screen.getByTestId('streamsLayoutTabContent-sources')).toBeInTheDocument();
    expect(screen.getByTestId('streamsLayoutHeader')).toHaveTextContent('4');
    expect(link).toHaveBeenCalledWith(
      '/v2/unit/{unitId}/{tab}',
      expect.objectContaining({ path: { unitId: 'edge', tab: 'map' } })
    );
  });

  it('remembers whether the Classic tab is open', () => {
    setup({ tab: 'classic' });
    const { rerender } = render(<StreamsLayout />);
    expect(sessionStorage.getItem(CLASSIC_TAB_ORIGIN_KEY)).toBe('true');

    setup({ tab: 'map' });
    rerender(<StreamsLayout />);
    expect(sessionStorage.getItem(CLASSIC_TAB_ORIGIN_KEY)).toBeNull();
  });

  it('remounts the tab when the unit changes', () => {
    setup({ unitId: 'edge', tab: 'sources' });
    const { rerender } = render(<StreamsLayout />);
    setup({ unitId: 'default', tab: 'sources' });
    rerender(<StreamsLayout />);

    expect(mockTabMounted).toHaveBeenCalledTimes(2);
  });
});
