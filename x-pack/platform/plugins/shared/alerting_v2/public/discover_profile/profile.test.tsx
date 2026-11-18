/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { Filter } from '@kbn/es-query';
import { DocViewsRegistry } from '@kbn/unified-doc-viewer';
import { createDiscoverProfile } from './profile';

const mockCreateEpisodeActions = jest.fn().mockReturnValue([
  {
    id: 'ALERTING_V2_ACK_EPISODE',
    order: 10,
    displayName: 'Acknowledge',
    iconType: 'check',
    isCompatible: () => true,
    execute: jest.fn(),
  },
  {
    id: 'ALERTING_V2_SNOOZE_EPISODE',
    order: 20,
    displayName: 'Snooze',
    iconType: 'bellSlash',
    isCompatible: () => false,
    execute: jest.fn(),
  },
]);

jest.mock('@kbn/alerting-v2-episodes-ui/actions/create_episode_actions', () => ({
  createEpisodeActions: (...args: unknown[]) => mockCreateEpisodeActions(...args),
}));

jest.mock('../kibana_services', () => ({
  // One stub stands in for every container service: the share URL service the links are
  // built with, and the user capabilities that gate the write actions.
  untilPluginStartServicesReady: () =>
    Promise.resolve({
      expressions: { execute: jest.fn() },
      container: {
        get: () => ({ url: { locators: { get: () => ({}) } }, canWrite: () => true }),
      },
    }),
}));

// Shows whether the episodes UI finds our services in the Kibana context.
jest.mock('./episode_overview_doc_view', () => ({
  EpisodeOverviewDocView: () => {
    const { services } = useKibana<{ expressions?: object }>();
    return <div>{services.expressions ? 'has expressions' : 'no expressions'}</div>;
  },
}));

const mockRootContext = { profileId: 'root' } as any;

describe('createDiscoverProfile', () => {
  describe('resolve', () => {
    it('returns isMatch:false for a non-ES|QL query', async () => {
      const provider = createDiscoverProfile();
      const result = await provider.resolve({
        rootContext: mockRootContext,
        query: { query: '', language: 'kuery' },
      });
      expect(result.isMatch).toBe(false);
    });

    it('returns isMatch:false for an ES|QL query not targeting $.alert-episodes', async () => {
      const provider = createDiscoverProfile();
      const result = await provider.resolve({
        rootContext: mockRootContext,
        query: { esql: 'FROM .rule-events | LIMIT 10' },
      });
      expect(result.isMatch).toBe(false);
    });

    it('returns isMatch:false when query is absent', async () => {
      const provider = createDiscoverProfile();
      const result = await provider.resolve({ rootContext: mockRootContext, query: undefined });
      expect(result.isMatch).toBe(false);
    });

    it('returns isMatch:true for an ES|QL query targeting $.alert-episodes', async () => {
      const provider = createDiscoverProfile();
      const result = await provider.resolve({
        rootContext: mockRootContext,
        query: { esql: 'FROM $.alert-episodes | LIMIT 10' },
      });
      expect(result.isMatch).toBe(true);
    });

    it('returns context.category as "default" when matching', async () => {
      const provider = createDiscoverProfile();
      const result = await provider.resolve({
        rootContext: mockRootContext,
        query: { esql: 'FROM $.alert-episodes | LIMIT 10' },
      });
      expect(result.isMatch).toBe(true);
      if (result.isMatch) {
        expect(result.context.category).toBe('default');
      }
    });

    it('matches case-insensitively', async () => {
      const provider = createDiscoverProfile();
      const result = await provider.resolve({
        rootContext: mockRootContext,
        query: { esql: 'from $.ALERT-EPISODES | limit 10' },
      });
      expect(result.isMatch).toBe(true);
    });
  });

  describe('getDefaultAppState', () => {
    it('returns the expected default columns', () => {
      const provider = createDiscoverProfile();
      const appState = provider.profile.getDefaultAppState!()();
      expect(appState.columns.map((c) => c.name)).toEqual([
        'episode.status',
        'severity',
        '@timestamp',
        'rule.id',
        'duration',
        'last_tags',
        'last_assignee_uid',
      ]);
    });
  });

  describe('getEsqlSearchContext', () => {
    const mockTimeRange = { from: '2026-11-04T10:00:00.000Z', to: '2026-11-05T10:00:00.000Z' };
    const mockPrevFilter: Filter = { meta: {}, query: { match_all: {} } };
    const mockPrev = jest.fn(() => ({ timeField: '@timestamp', filters: [mockPrevFilter] }));

    it('drops the default time field', () => {
      const provider = createDiscoverProfile();

      const context = provider.profile.getEsqlSearchContext!(mockPrev)({
        timeRange: mockTimeRange,
        timeField: '@timestamp',
      });

      expect(context.timeField).toBeUndefined();
    });

    it('adds a time range filter that bounds the alert events only', () => {
      const provider = createDiscoverProfile();

      const { filters } = provider.profile.getEsqlSearchContext!(mockPrev)({
        timeRange: mockTimeRange,
        timeField: '@timestamp',
      });

      expect(filters).toHaveLength(2);
      expect(filters?.[0]).toBe(mockPrevFilter);
      expect(filters?.[1].query).toEqual({
        bool: {
          should: [
            {
              bool: {
                filter: [
                  { term: { type: 'alert' } },
                  expect.objectContaining({
                    range: expect.objectContaining({ '@timestamp': expect.anything() }),
                  }),
                ],
              },
            },
            { exists: { field: 'action_type' } },
          ],
          minimum_should_match: 1,
        },
      });
    });
  });

  describe('getCellRenderers', () => {
    it('returns renderers for the episode fields', () => {
      const provider = createDiscoverProfile();

      const renderers = provider.profile.getCellRenderers!(() => ({}), {} as any)({} as any);

      expect(renderers['episode.status']).toBeDefined();
      expect(renderers.severity).toBeDefined();
      expect(renderers['rule.id']).toBeDefined();
      expect(renderers.duration).toBeDefined();
      expect(renderers.last_tags).toBeDefined();
      expect(renderers.last_assignee_uid).toBeDefined();
    });
  });

  describe('getColumnsConfiguration', () => {
    it('uses the alerts page column titles', () => {
      const provider = createDiscoverProfile();
      const columns = provider.profile.getColumnsConfiguration!(undefined)();
      const getTitle = (id: string) =>
        columns[id]({ column: { id, display: 'element' } }).displayAsText;

      expect(getTitle('episode.status')).toBe('Status');
      expect(getTitle('severity')).toBe('Severity');
      expect(getTitle('rule.id')).toBe('Rule');
      expect(getTitle('duration')).toBe('Duration');
      expect(columns.duration({ column: { id: 'duration', display: 'element' } }).display).toBe(
        undefined
      );
    });

    it('spreads previous renderers alongside episode renderers', () => {
      const provider = createDiscoverProfile();
      const renderers = provider.profile.getCellRenderers!(
        () => ({ existingField: () => null }),

        {} as any
      )({} as any);

      expect(renderers.existingField).toBeDefined();
    });
  });

  describe('getDocViewer', () => {
    const mockRecord = {
      id: 'ep-1',
      raw: {},
      flattened: { 'episode.id': 'ep-1', group_hash: 'hash-1' },
    } as any;

    const mockPrev = jest.fn().mockReturnValue({
      title: undefined,

      docViewsRegistry: (r: any) => r,
    });

    const mockTableRender = jest.fn(() => <div />);
    const mockSetExpandedDoc = jest.fn();
    const createMockRegistry = () =>
      new DocViewsRegistry([
        { id: 'doc_view_table', title: 'Table', order: 10, render: mockTableRender },
        { id: 'doc_view_source', title: 'JSON', order: 20, render: () => <div /> },
      ]);

    const getExtension = (record = mockRecord) => {
      const provider = createDiscoverProfile();
      return provider.profile.getDocViewer!(mockPrev, {
        toolkit: { actions: { setExpandedDoc: mockSetExpandedDoc } },
      } as any)({
        record,
        actions: {} as any,
      });
    };

    const getRegistry = (): DocViewsRegistry =>
      getExtension().docViewsRegistry(createMockRegistry());

    it('titles the flyout like the alerts page', () => {
      expect(getExtension().title).toBe('Alert details');
    });

    it('adds the episode tabs before the Discover ones', () => {
      const titles = getRegistry()
        .getAll()
        .map(({ title }) => title);

      expect(titles).toEqual(['Overview', 'Timeline', 'Table', 'JSON']);
    });

    it('gives the episode tabs our services through the Kibana context', async () => {
      const overviewDocView = getRegistry()
        .getAll()
        .find(({ id }) => id === 'alerting_v2_overview');

      render(overviewDocView!.render({ hit: mockRecord, dataView: {} as any }));

      expect(await screen.findByText('has expressions')).toBeInTheDocument();
    });

    it('replaces the Table tab content and keeps its id, title and order', () => {
      const tableDocView = getRegistry()
        .getAll()
        .find(({ id }) => id === 'doc_view_table');

      expect(tableDocView).toEqual(
        expect.objectContaining({ id: 'doc_view_table', title: 'Table', order: 10 })
      );
      expect(tableDocView!.render).not.toBe(mockTableRender);
    });
  });

  describe('getRowAdditionalLeadingControls', () => {
    it('returns only prev controls when services are not yet ready', () => {
      const provider = createDiscoverProfile();

      const prevControl = { id: 'prev', render: jest.fn() } as any;

      const controls = provider.profile.getRowAdditionalLeadingControls!(
        () => [prevControl],
        {} as any
      )({} as any);
      expect(controls).toEqual([prevControl]);
    });

    it('returns prev controls plus episode action columns after services resolve', async () => {
      const provider = createDiscoverProfile();
      // Allow the untilPluginStartServicesReady promise to settle.
      await Promise.resolve();

      const controls = provider.profile.getRowAdditionalLeadingControls!(
        () => [],
        {} as any
      )({} as any);
      expect(controls).toHaveLength(2);

      expect((controls as any[])[0].id).toBe('ALERTING_V2_ACK_EPISODE');

      expect((controls as any[])[1].id).toBe('ALERTING_V2_SNOOZE_EPISODE');
    });

    it('offers the write actions to users who can write alerts', async () => {
      createDiscoverProfile();
      await Promise.resolve();

      expect(mockCreateEpisodeActions).toHaveBeenCalledWith(
        expect.objectContaining({ canWriteNativeEpisodes: true })
      );
    });

    it('respects isCompatible via isAvailable', async () => {
      const provider = createDiscoverProfile();
      await Promise.resolve();

      const controls = provider.profile.getRowAdditionalLeadingControls!(
        () => [],
        {} as any
      )({} as any) as any[];
      const mockRowProps = { rowIndex: 0, record: { flattened: {} } };

      // First action: isCompatible returns true → isAvailable returns true
      expect(controls[0].isAvailable(mockRowProps)).toBe(true);
      // Second action: isCompatible returns false → isAvailable returns false
      expect(controls[1].isAvailable(mockRowProps)).toBe(false);
    });

    it('reloads the Discover data after an action succeeds', async () => {
      const provider = createDiscoverProfile();
      await Promise.resolve();
      const mockRefreshData = jest.fn();

      const controls = provider.profile.getRowAdditionalLeadingControls!(() => [], {
        toolkit: { actions: { refreshData: mockRefreshData } },
      })({} as any) as any[];
      const MockControl = ({ onClick }: { onClick: () => void }) => (
        <button onClick={onClick}>action</button>
      );
      render(controls[0].render(MockControl, { rowIndex: 0, record: { flattened: {} } }));

      fireEvent.click(screen.getByText('action'));
      const [{ onSuccess }] =
        mockCreateEpisodeActions.mock.results[0].value[0].execute.mock.calls[0];
      onSuccess();

      expect(mockRefreshData).toHaveBeenCalledTimes(1);
    });
  });
});
