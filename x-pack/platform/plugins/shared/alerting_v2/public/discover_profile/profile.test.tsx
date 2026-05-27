/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  untilPluginStartServicesReady: () => Promise.resolve({}),
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
        '@timestamp',
        'effective_status',
        'rule.id',
        'last_tags',
        'last_assignee_uid',
      ]);
    });
  });

  describe('getCellRenderers', () => {
    it('returns renderers for all four episode fields', () => {
      const provider = createDiscoverProfile();

      const renderers = provider.profile.getCellRenderers!(() => ({}), {} as any)({} as any);

      expect(renderers.effective_status).toBeDefined();
      expect(renderers.last_tags).toBeDefined();
      expect(renderers['rule.id']).toBeDefined();
      expect(renderers.last_assignee_uid).toBeDefined();
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

    it('registers four doc viewer sections', () => {
      const provider = createDiscoverProfile();
      const extension = provider.profile.getDocViewer!(
        mockPrev,

        {} as any
      )({
        record: mockRecord,

        actions: {} as any,
      });

      const mockRegistry = { add: jest.fn(), getAll: jest.fn().mockReturnValue([]) };

      extension.docViewsRegistry(mockRegistry as any);

      expect(mockRegistry.add).toHaveBeenCalledTimes(4);
    });

    it('registers sections with titles: Overview, Related, Metadata, Runbook', () => {
      const provider = createDiscoverProfile();
      const extension = provider.profile.getDocViewer!(
        mockPrev,

        {} as any
      )({
        record: mockRecord,

        actions: {} as any,
      });

      const mockRegistry = { add: jest.fn(), getAll: jest.fn().mockReturnValue([]) };

      extension.docViewsRegistry(mockRegistry as any);

      const titles = (mockRegistry.add.mock.calls as Array<[{ title: string }]>).map(
        ([section]) => section.title
      );
      expect(titles).toEqual(['Overview', 'Related', 'Metadata', 'Runbook']);
    });

    it('registers sections with ascending order values', () => {
      const provider = createDiscoverProfile();
      const extension = provider.profile.getDocViewer!(
        mockPrev,

        {} as any
      )({
        record: mockRecord,

        actions: {} as any,
      });

      const mockRegistry = { add: jest.fn(), getAll: jest.fn().mockReturnValue([]) };

      extension.docViewsRegistry(mockRegistry as any);

      const orders = (mockRegistry.add.mock.calls as Array<[{ order: number }]>).map(
        ([section]) => section.order
      );
      expect(orders).toEqual([0, 10, 20, 30]);
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
  });
});
