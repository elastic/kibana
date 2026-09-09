/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

jest.mock('@kbn/react-query', () => ({
  useQuery: jest.fn(),
}));

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useQuery } from '@kbn/react-query';
import { useInstalledContent } from './use_installed_content';
import { displayedAssetTypes } from '@kbn/fleet-plugin/common';
import { AssetTitleMap } from '@kbn/fleet-plugin/public';

const mockUseKibana = useKibana as jest.Mock;
const mockUseQuery = useQuery as jest.Mock;

const httpMock = { post: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  mockUseKibana.mockReturnValue({ services: { http: httpMock } });
  mockUseQuery.mockReturnValue({ data: undefined, isLoading: false });
});

describe('useInstalledContent', () => {
  it('groups results into categories ordered by displayedAssetTypes', () => {
    mockUseQuery.mockReturnValue({
      data: {
        items: [
          {
            id: 'dash-1',
            type: 'dashboard',
            attributes: { title: 'My Dashboard' },
            appLink: '/dash',
          },
          {
            id: 'viz-1',
            type: 'visualization',
            attributes: { title: 'My Visualization' },
            appLink: '/viz',
          },
          {
            id: 'rule-1',
            type: 'security-rule',
            attributes: { title: 'My Rule' },
            appLink: '',
          },
        ],
      },
      isLoading: false,
    });

    const { result } = renderHook(() =>
      useInstalledContent({
        installedKibana: [
          { id: 'dash-1', type: 'dashboard' },
          { id: 'viz-1', type: 'visualization' },
          { id: 'rule-1', type: 'security-rule' },
        ],
        installedEs: [],
      })
    );

    const { categories } = result.current;

    // All three types must appear
    expect(categories.map((c) => c.type)).toContain('dashboard');
    expect(categories.map((c) => c.type)).toContain('visualization');
    expect(categories.map((c) => c.type)).toContain('security-rule');

    // Order must follow displayedAssetTypes order
    const dashboardIdx = categories.findIndex((c) => c.type === 'dashboard');
    const vizIdx = categories.findIndex((c) => c.type === 'visualization');
    const ruleIdx = categories.findIndex((c) => c.type === 'security-rule');
    expect(dashboardIdx).toBeLessThan(vizIdx);
    expect(vizIdx).toBeLessThan(ruleIdx);
  });

  it('uses AssetTitleMap for category titles', () => {
    mockUseQuery.mockReturnValue({
      data: {
        items: [{ id: 'dash-1', type: 'dashboard', attributes: { title: 'D' }, appLink: '/d' }],
      },
      isLoading: false,
    });

    const { result } = renderHook(() =>
      useInstalledContent({
        installedKibana: [{ id: 'dash-1', type: 'dashboard' }],
        installedEs: [],
      })
    );

    const dashCat = result.current.categories.find((c) => c.type === 'dashboard');
    expect(dashCat?.title).toBe(AssetTitleMap.dashboard);
  });

  it('sorts assets within a category by title alphabetically', () => {
    mockUseQuery.mockReturnValue({
      data: {
        items: [
          { id: 'b', type: 'dashboard', attributes: { title: 'B Dashboard' }, appLink: '' },
          { id: 'a', type: 'dashboard', attributes: { title: 'A Dashboard' }, appLink: '' },
        ],
      },
      isLoading: false,
    });

    const { result } = renderHook(() =>
      useInstalledContent({
        installedKibana: [
          { id: 'b', type: 'dashboard' },
          { id: 'a', type: 'dashboard' },
        ],
        installedEs: [],
      })
    );

    const dashCat = result.current.categories.find((c) => c.type === 'dashboard');
    expect(dashCat?.assets.map((a) => a.id)).toEqual(['a', 'b']);
  });

  it('an asset with an empty appLink yields no appLink on the output item', () => {
    mockUseQuery.mockReturnValue({
      data: {
        items: [
          { id: 'rule-1', type: 'security-rule', attributes: { title: 'Rule' }, appLink: '' },
        ],
      },
      isLoading: false,
    });

    const { result } = renderHook(() =>
      useInstalledContent({
        installedKibana: [{ id: 'rule-1', type: 'security-rule' }],
        installedEs: [],
      })
    );

    const ruleCat = result.current.categories.find((c) => c.type === 'security-rule');
    expect(ruleCat?.assets[0].appLink).toBeUndefined();
  });

  it('requests all displayedAssetTypes, not just dashboard/security-rule', () => {
    renderHook(() =>
      useInstalledContent({
        installedKibana: [
          { id: 'dash-1', type: 'dashboard' },
          { id: 'lens-1', type: 'lens' },
          { id: 'viz-1', type: 'visualization' },
          { id: 'search-1', type: 'search' },
          { id: 'map-1', type: 'map' },
        ],
        installedEs: [],
      })
    );

    const queryOpts = mockUseQuery.mock.calls[0][0];
    const queryKey: string = queryOpts.queryKey[2];
    // All five ids must be included in the query key
    expect(queryKey).toContain('dash-1');
    expect(queryKey).toContain('lens-1');
    expect(queryKey).toContain('viz-1');
    expect(queryKey).toContain('search-1');
    expect(queryKey).toContain('map-1');
  });

  it('excludes knowledge_base from the API request', () => {
    renderHook(() =>
      useInstalledContent({
        installedKibana: [
          { id: 'dash-1', type: 'dashboard' },
          { id: 'kb-1', type: 'knowledge_base' },
        ],
        installedEs: [],
      })
    );

    const queryOpts = mockUseQuery.mock.calls[0][0];
    const queryKey: string = queryOpts.queryKey[2];
    expect(queryKey).toContain('dash-1');
    expect(queryKey).not.toContain('kb-1');
  });

  it('enriches esAssets with appLink from the bulk-assets response', () => {
    mockUseQuery.mockReturnValue({
      data: {
        items: [
          {
            id: '.fleet-ilm-policy',
            type: 'ilm_policy',
            attributes: {},
            appLink:
              '/app/management/data/index_lifecycle_management/policies/edit/.fleet-ilm-policy',
          },
        ],
      },
      isLoading: false,
    });

    const esAssets = [{ id: '.fleet-ilm-policy', type: 'ilm_policy' as any }];
    const { result } = renderHook(() =>
      useInstalledContent({ installedKibana: [], installedEs: esAssets })
    );

    expect(result.current.esAssets).toEqual([
      {
        id: '.fleet-ilm-policy',
        type: 'ilm_policy',
        appLink: '/app/management/data/index_lifecycle_management/policies/edit/.fleet-ilm-policy',
      },
    ]);
  });

  it('groups esAssets by type in displayedAssetTypes order, sorted by id within each group', () => {
    mockUseQuery.mockReturnValue({ data: { items: [] }, isLoading: false });

    const esAssets = [
      { id: 'z-pipeline', type: 'ingest_pipeline' as any },
      { id: 'a-pipeline', type: 'ingest_pipeline' as any },
      { id: 'z-template', type: 'index_template' as any },
      { id: 'a-template', type: 'index_template' as any },
    ];

    const { result } = renderHook(() =>
      useInstalledContent({ installedKibana: [], installedEs: esAssets })
    );

    const ids = result.current.esAssets.map((a) => a.id);
    // index_template comes before ingest_pipeline in displayedAssetTypes order
    expect(ids.indexOf('a-template')).toBeLessThan(ids.indexOf('a-pipeline'));
    expect(ids.indexOf('z-template')).toBeLessThan(ids.indexOf('z-pipeline'));
    // within each type, sorted alphabetically by id
    expect(ids.indexOf('a-template')).toBeLessThan(ids.indexOf('z-template'));
    expect(ids.indexOf('a-pipeline')).toBeLessThan(ids.indexOf('z-pipeline'));
  });

  it('yields no appLink for ES assets the server returned no link for (e.g. knowledge_base)', () => {
    mockUseQuery.mockReturnValue({ data: { items: [] }, isLoading: false });
    const esAssets = [{ id: 'some-kb-entry', type: 'knowledge_base' as any }];
    const { result } = renderHook(() =>
      useInstalledContent({ installedKibana: [], installedEs: esAssets })
    );
    expect(result.current.esAssets[0].appLink).toBeUndefined();
  });

  it('displayedAssetTypes ordering is stable (snapshot)', () => {
    // Guard against the ordering silently changing in Fleet — this test catches
    // regressions where our category output would reorder unexpectedly.
    expect(displayedAssetTypes.slice(0, 4)).toEqual([
      'dashboard',
      'lens',
      'visualization',
      'search',
    ]);
  });
});
