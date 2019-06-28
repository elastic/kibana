/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useUrlParams } from '../use_url_params';

describe('useUrlParams', () => {
  it('returns the expected params and an update function', () => {
    const history: any[] = [];
    const location = { pathname: '/', search: '_g=()' };
    const [params, updateFunction] = useUrlParams(history, location);
    expect(params).toEqual({
      autorefreshInterval: 60000,
      autorefreshIsPaused: false,
      dateRangeStart: 'now-15m',
      dateRangeEnd: 'now',
      search: '',
      selectedPingStatus: 'down',
    });
    expect(updateFunction).toBeInstanceOf(Function);
  });

  it('returns an update URL function that pushes a new URL to the history object', () => {
    const history: any[] = [];
    const location = { pathname: '/', search: '_g=()' };
    const [, updateFunction] = useUrlParams(history, location);
    const nextPath = updateFunction({ search: 'monitor.id:foo status:down' });
    expect(nextPath).toEqual('/?_g=()&search=monitor.id%3Afoo%20status%3Adown');
    expect(history).toHaveLength(1);
    expect(history[0]).toEqual({
      pathname: '/',
      search: '_g=()&search=monitor.id%3Afoo%20status%3Adown',
    });
  });
});
