/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { streamsAppRouter } from './config';

describe('streamsAppRouter', () => {
  describe('link generation', () => {
    it('generates link for the root path', () => {
      const link = streamsAppRouter.link('/');
      expect(link).toBe('/');
    });

    it('generates link for the stream list with time range', () => {
      // @ts-expect-error - query params are optional for this route
      const link = streamsAppRouter.link('/', {
        query: { rangeFrom: 'now-15m', rangeTo: 'now' },
      });
      expect(link).toBe('/?rangeFrom=now-15m&rangeTo=now');
    });

    it('generates link for stream detail root', () => {
      const link = streamsAppRouter.link('/{key}', {
        path: { key: 'logs' },
      });
      expect(link).toBe('/logs');
    });

    it('generates link for stream management tab', () => {
      const link = streamsAppRouter.link('/{key}/management/{tab}', {
        path: { key: 'logs', tab: 'retention' },
      });
      expect(link).toBe('/logs/management/retention');
    });

    it('generates link for stream management tab with query params', () => {
      const link = streamsAppRouter.link('/{key}/management/{tab}', {
        path: { key: 'logs', tab: 'routing' },
        query: { rangeFrom: 'now-1h', rangeTo: 'now' },
      });
      expect(link).toBe('/logs/management/routing?rangeFrom=now-1h&rangeTo=now');
    });

    it('generates link for discovery page', () => {
      const link = streamsAppRouter.link('/_discovery/{tab}', {
        path: { tab: 'streams' },
      });
      expect(link).toBe('/_discovery/streams');
    });

    it('encodes special characters in stream keys', () => {
      const link = streamsAppRouter.link('/{key}/management/{tab}', {
        path: { key: 'logs.nginx.access', tab: 'retention' },
      });
      expect(link).toBe('/logs.nginx.access/management/retention');
    });
  });

  describe('route matching', () => {
    it('matches the root path', () => {
      const location = { pathname: '/', search: '', hash: '', state: undefined };
      const matches = streamsAppRouter.matchRoutes('/', location);
      expect(matches).toHaveLength(2);
      expect(matches[1]!.route.path).toBe('/');
    });

    it('matches stream detail root path', () => {
      const location = { pathname: '/logs', search: '', hash: '', state: undefined };
      const matches = streamsAppRouter.matchRoutes('/{key}', location);
      expect(matches).toHaveLength(3);
      // Params are accumulated across matched routes - check the last match that has path params
      const params = streamsAppRouter.getParams('/{key}', location);
      expect(params?.path.key).toBe('logs');
    });

    it('matches stream management tab path', () => {
      const location = {
        pathname: '/logs/management/retention',
        search: '',
        hash: '',
        state: undefined,
      };
      const matches = streamsAppRouter.matchRoutes('/{key}/management/{tab}', location);
      expect(matches).toHaveLength(3);
      const params = streamsAppRouter.getParams('/{key}/management/{tab}', location);
      expect(params?.path.key).toBe('logs');
      expect(params?.path.tab).toBe('retention');
    });

    it('matches legacy tab route that redirects (/{key}/{tab})', () => {
      const location = {
        pathname: '/logs/overview',
        search: '',
        hash: '',
        state: undefined,
      };
      // The route /{key}/{tab} exists and should match
      const matches = streamsAppRouter.matchRoutes('/{key}/{tab}', location);
      expect(matches).toHaveLength(3);
      const params = streamsAppRouter.getParams('/{key}/{tab}', location);
      expect(params?.path.key).toBe('logs');
      expect(params?.path.tab).toBe('overview');
    });

    it('matches discovery tab path', () => {
      const location = {
        pathname: '/_discovery/streams',
        search: '',
        hash: '',
        state: undefined,
      };
      const params = streamsAppRouter.getParams('/_discovery/{tab}', location);
      expect(params?.path.tab).toBe('streams');
    });

    it('parses query parameters correctly', () => {
      const location = {
        pathname: '/logs/management/retention',
        search: '?rangeFrom=now-15m&rangeTo=now',
        hash: '',
        state: undefined,
      };
      const params = streamsAppRouter.getParams('/{key}/management/{tab}', location);
      expect(params?.query?.rangeFrom).toBe('now-15m');
      expect(params?.query?.rangeTo).toBe('now');
    });

    it('parses management-specific query params (openFlyout, selectedSystems, pageState)', () => {
      const location = {
        pathname: '/logs/management/enrichment',
        search:
          '?rangeFrom=now-1h&rangeTo=now&openFlyout=test&selectedSystems=system1&pageState=abc',
        hash: '',
        state: undefined,
      };
      const params = streamsAppRouter.getParams('/{key}/management/{tab}', location);
      expect(params?.query?.openFlyout).toBe('test');
      expect(params?.query?.selectedSystems).toBe('system1');
      expect(params?.query?.pageState).toBe('abc');
    });
  });

  describe('route structure validation', () => {
    it('has route for stream list at root', () => {
      const routes = streamsAppRouter.getRoutesToMatch('/');
      expect(routes.length).toBeGreaterThan(0);
    });

    it('has route for stream detail management', () => {
      const routes = streamsAppRouter.getRoutesToMatch('/{key}/management/{tab}');
      expect(routes.length).toBeGreaterThan(0);
    });

    it('has legacy redirect route /{key}/{tab}', () => {
      const routes = streamsAppRouter.getRoutesToMatch('/{key}/{tab}');
      expect(routes.length).toBeGreaterThan(0);
    });

    it('has catch-all route /*', () => {
      // The catch-all route is nested under /{key}, so we need to test matching
      // an arbitrary deep path
      const location = {
        pathname: '/logs/management/retention/some/deep/path',
        search: '',
        hash: '',
        state: undefined,
      };
      // Should match using the greedy /* pattern
      const matches = streamsAppRouter.matchRoutes('/*', location);
      expect(matches.length).toBeGreaterThan(0);
    });

    it('has discovery routes', () => {
      const routes = streamsAppRouter.getRoutesToMatch('/_discovery/{tab}');
      expect(routes.length).toBeGreaterThan(0);
    });
  });

  describe('getParams helper', () => {
    it('extracts params from location', () => {
      const location = {
        pathname: '/logs/management/retention',
        search: '?rangeFrom=now-1h&rangeTo=now',
        hash: '',
        state: undefined,
      };
      const params = streamsAppRouter.getParams('/{key}/management/{tab}', location);
      expect(params).toEqual({
        path: { key: 'logs', tab: 'retention' },
        query: { rangeFrom: 'now-1h', rangeTo: 'now' },
      });
    });

    it('returns undefined for non-matching route', () => {
      const location = {
        pathname: '/logs/management/retention',
        search: '',
        hash: '',
        state: undefined,
      };
      // Trying to match a specific path that doesn't match
      const params = streamsAppRouter.getParams('/_discovery/{tab}', location, true);
      expect(params).toBeUndefined();
    });
  });
});
