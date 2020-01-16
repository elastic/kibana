/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getUrlState } from './url_state';

describe('getUrlState', () => {
  test('properly decode url with _g and _a', () => {
    expect(
      getUrlState(
        "?_a=(mlExplorerFilter:(),mlExplorerSwimlane:(viewByFieldName:action),query:(query_string:(analyze_wildcard:!t,query:'*')))&_g=(ml:(jobIds:!(dec-2)),refreshInterval:(display:Off,pause:!f,value:0),time:(from:'2019-01-01T00:03:40.000Z',mode:absolute,to:'2019-08-30T11:55:07.000Z'))&savedSearchId=571aaf70-4c88-11e8-b3d7-01146121b73d"
      )
    ).toEqual({
      _a: {
        mlExplorerFilter: {},
        mlExplorerSwimlane: {
          viewByFieldName: 'action',
        },
        query: {
          query_string: {
            analyze_wildcard: true,
            query: '*',
          },
        },
      },
      _g: {
        ml: {
          jobIds: ['dec-2'],
        },
        refreshInterval: {
          display: 'Off',
          pause: false,
          value: 0,
        },
        time: {
          from: '2019-01-01T00:03:40.000Z',
          mode: 'absolute',
          to: '2019-08-30T11:55:07.000Z',
        },
      },
      savedSearchId: '571aaf70-4c88-11e8-b3d7-01146121b73d',
    });
  });
});
