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

const mockUseKibana = useKibana as jest.Mock;
const mockUseQuery = useQuery as jest.Mock;

const httpMock = { post: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  mockUseKibana.mockReturnValue({ services: { http: httpMock } });
  mockUseQuery.mockReturnValue({ data: undefined, isLoading: false });
});

describe('useInstalledContent', () => {
  it('partitions dashboards and detection rules from bulk_assets response', () => {
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
            id: 'rule-1',
            type: 'security-rule',
            attributes: { title: 'My Rule' },
            appLink: '/rule',
          },
          { id: 'lens-1', type: 'lens', attributes: { title: 'Lens Viz' } },
        ],
      },
      isLoading: false,
    });

    const { result } = renderHook(() =>
      useInstalledContent({
        installedKibana: [
          { id: 'dash-1', type: 'dashboard' as const },
          { id: 'rule-1', type: 'security-rule' as const },
          { id: 'lens-1', type: 'lens' as const },
        ],
        installedEs: [],
      })
    );

    expect(result.current.dashboards).toEqual([
      { id: 'dash-1', title: 'My Dashboard', appLink: '/dash' },
    ]);
    expect(result.current.detectionRules).toEqual([
      { id: 'rule-1', title: 'My Rule', appLink: '/rule' },
    ]);
  });

  it('returns esAssets from installedEs prop', () => {
    const esAssets = [{ id: 'metrics-aws.ec2-*', type: 'index_template' as any }];
    const { result } = renderHook(() =>
      useInstalledContent({ installedKibana: [], installedEs: esAssets })
    );
    expect(result.current.esAssets).toEqual(esAssets);
  });

  it('only queries dashboards and security-rule types (not lens, maps, etc.)', () => {
    renderHook(() =>
      useInstalledContent({
        installedKibana: [
          { id: 'dash-1', type: 'dashboard' as const },
          { id: 'lens-1', type: 'lens' as const },
        ],
        installedEs: [],
      })
    );

    const queryOpts = mockUseQuery.mock.calls[0][0];
    // queryKey should only include the dashboard id, not lens
    expect(queryOpts.queryKey[2]).toBe('dash-1');
  });
});
