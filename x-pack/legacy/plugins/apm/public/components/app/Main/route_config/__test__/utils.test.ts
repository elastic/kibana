/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getRouteByName, generatePath } from '../utils';

jest.mock('../index.tsx', () => ({
  routes: [
    {
      name: 'home',
      path: '/'
    },
    {
      name: 'services',
      path: '/services'
    },
    {
      name: 'errors',
      path: '/services/:serviceName/errors'
    },
    {
      name: 'metrics',
      path: '/services/:serviceName/nodes/:serviceNodeName/metrics'
    },
    {
      name: 'link_to_trace',
      path: '/link-to/trace/:traceId'
    }
  ]
}));

describe('Route Utils', () => {
  afterAll(() => {
    jest.clearAllMocks();
  });
  describe('getRouteByName', () => {
    it('returns the route found', () => {
      expect(getRouteByName('home')).toEqual({ name: 'home', path: '/' });
      expect(getRouteByName('services')).toEqual({
        name: 'services',
        path: '/services'
      });
    });
    it('returns undefined when route is not found', () => {
      expect(getRouteByName('unknow_route')).toBeUndefined();
    });
  });

  describe('generatePath', () => {
    it('returns the path without path param', () => {
      expect(generatePath('services')).toEqual('/services');
      expect(generatePath('home')).toEqual('/');
    });
    it('replaces the path param', () => {
      expect(generatePath('errors', { serviceName: 'foo' })).toEqual(
        '/services/foo/errors'
      );
    });
    it('replaces multiple path params', () => {
      expect(
        generatePath('metrics', {
          serviceName: 'foo',
          serviceNodeName: 'bar'
        })
      ).toEqual('/services/foo/nodes/bar/metrics');
    });
    it('replaces path params in the end', () => {
      expect(
        generatePath('link_to_trace', {
          traceId: 'foo'
        })
      ).toEqual('/link-to/trace/foo');
    });
  });
});
