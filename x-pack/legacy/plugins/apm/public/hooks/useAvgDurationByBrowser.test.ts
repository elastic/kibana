/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook } from '@testing-library/react-hooks';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import * as useFetcherModule from './useFetcher';
import { useAvgDurationByBrowser } from './useAvgDurationByBrowser';

describe('useAvgDurationByBrowser', () => {
  it('returns data', () => {
    const data = [
      { title: 'Other', data: [{ x: 1572530100000, y: 130010.8947368421 }] }
    ];
    jest.spyOn(useFetcherModule, 'useFetcher').mockReturnValueOnce({
      data,
      refetch: () => {},
      status: 'success' as useFetcherModule.FETCH_STATUS
    });
    const { result } = renderHook(() => useAvgDurationByBrowser());

    expect(result.current.data).toEqual([
      {
        color: theme.euiColorVis0,
        data: [{ x: 1572530100000, y: 130010.8947368421 }],
        title: 'Other',
        type: 'linemark'
      }
    ]);
  });
});
