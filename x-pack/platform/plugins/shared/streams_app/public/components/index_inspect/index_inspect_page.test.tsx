/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { IndexInspectPage } from './index_inspect_page';

jest.mock('../../hooks/use_streams_app_params', () => ({
  useStreamsAppParams: () => ({
    path: { indexName: 'logs-a-b', tab: 'overview' },
    query: { unitId: 'edge' },
  }),
}));
jest.mock('../../hooks/use_streams_app_router', () => ({
  useStreamsAppRouter: () => ({
    link: jest.fn((path: string, params: unknown) => JSON.stringify({ path, params })),
  }),
}));
jest.mock('../../hooks/use_time_range', () => ({
  useTimeRange: () => ({ rangeFrom: 'now-15m', rangeTo: 'now' }),
}));
jest.mock('../../hooks/use_streams_privileges', () => ({
  useStreamsPrivileges: () => ({ access: { v2: true } }),
}));
jest.mock('./use_index_metadata', () => ({
  useIndexMetadata: () => ({
    value: { exists: true, is_data_stream: true, privileges: { read_failure_store: false } },
    loading: false,
  }),
}));
jest.mock('../stream_badges', () => ({
  LifecycleBadge: () => null,
  useDiscoverStreamLink: () => undefined,
}));
jest.mock('./use_index_management_link', () => ({
  useIndexManagementLink: () => undefined,
}));
jest.mock('./index_quality_badge', () => ({
  IndexQualityBadge: () => null,
}));
jest.mock('./index_inspect_panels', () => ({
  IndexInspectPanels: () => null,
}));
jest.mock('../redirect_to', () => ({
  RedirectTo: ({ path }: { path: string }) => <div data-test-subj="redirectTo">{path}</div>,
}));
jest.mock('../streams_app_page_template', () => ({
  StreamsAppHeader: ({
    tabs,
    back,
  }: {
    tabs: Array<{ href?: string; 'data-test-subj': string }>;
    back: { href: string; label: string };
  }) => (
    <div>
      {tabs.map((tab) => (
        <div key={tab['data-test-subj']} data-test-subj={tab['data-test-subj']}>
          {tab.href}
        </div>
      ))}
      <div data-test-subj="streamsIndexInspectBack">{back.href}</div>
    </div>
  ),
  StreamsAppPageTemplate: {
    Body: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
}));

const range = { rangeFrom: 'now-15m', rangeTo: 'now' };

describe('IndexInspectPage', () => {
  it('keeps the unit on the tab links and the back link', () => {
    render(<IndexInspectPage />);

    expect(
      JSON.parse(screen.getByTestId('streamsIndexInspectTab-retention').textContent ?? '')
    ).toEqual({
      path: '/v2/indices/{indexName}/{tab}',
      params: {
        path: { indexName: 'logs-a-b', tab: 'retention' },
        query: { ...range, unitId: 'edge' },
      },
    });
    expect(JSON.parse(screen.getByTestId('streamsIndexInspectBack').textContent ?? '')).toEqual({
      path: '/v2/unit/{unitId}/{tab}',
      params: { path: { unitId: 'edge', tab: 'destinations' }, query: range },
    });
  });
});
