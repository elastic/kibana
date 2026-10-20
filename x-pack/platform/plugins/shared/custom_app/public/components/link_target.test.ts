/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSource } from '@kbn/custom-app-common';
import { resolveLink } from './link_target';

const navigateToApp = jest.fn();
const getUrlForApp = jest.fn(
  (app: string, { path }: { path?: string } = {}) => `/base/app/${app}${path ?? ''}`
);
const application = {
  getUrlForApp,
  navigateToApp,
  capabilities: { navLinks: { dashboards: true, discover: true, customApp: true, hidden: false } },
};

const navigate = jest.fn();
const getRedirectUrl = jest.fn((params: unknown) => `/base/app/r?l=${JSON.stringify(params)}`);
const share = {
  url: { locators: { get: jest.fn(() => ({ getRedirectUrl, navigate })) } },
};

const sources: Record<string, DataSource> = {
  rows: {
    type: 'esql',
    query: 'FROM logs | WHERE service == ?service AND u IN (?users) | LIMIT 5',
  },
  cases: { type: 'cases' },
};

const resolve = (
  to: Parameters<typeof resolveLink>[0]['to'],
  {
    state = {},
    queryValues = {},
    withShare = true,
  }: {
    state?: Record<string, string | number | boolean | string[]>;
    queryValues?: Record<string, string | number | boolean | string[]>;
    withShare?: boolean;
  } = {}
) =>
  resolveLink({
    to,
    state,
    queryValues,
    timeRange: { from: 'now-7d', to: 'now' },
    getSource: (id) => sources[id],
    application: application as never,
    share: withShare ? (share as never) : undefined,
  });

describe('where a link goes', () => {
  beforeEach(() => {
    navigateToApp.mockClear();
    navigate.mockClear();
    getUrlForApp.mockClear();
    getRedirectUrl.mockClear();
    share.url.locators.get.mockClear();
  });

  describe('to a page of an application', () => {
    it('is the address of the page, and goes there inside Kibana', () => {
      const link = resolve({ type: 'app', app: 'dashboards', path: '#/view/abc' });

      expect(link).toMatchObject({ status: 'ready', href: '/base/app/dashboards#/view/abc' });
      if (link.status === 'ready') link.navigate();
      expect(navigateToApp).toHaveBeenCalledWith('dashboards', { path: '#/view/abc' });
    });

    it('is the application itself when there is no path', () => {
      expect(resolve({ type: 'app', app: 'discover' })).toMatchObject({
        href: '/base/app/discover',
      });
    });

    it('puts the values of the app in the path', () => {
      expect(
        resolve(
          { type: 'app', app: 'dashboards', path: '#/view/{{state.id}}' },
          { state: { id: 'abc' } }
        )
      ).toMatchObject({ href: '/base/app/dashboards#/view/abc' });
    });

    it('keeps a value to one part of the path, whatever it holds, so it cannot go elsewhere', () => {
      const link = resolve(
        { type: 'app', app: 'dashboards', path: '#/view/{{state.id}}' },
        { state: { id: '../../other?x=1#y' } }
      );

      expect(link).toMatchObject({
        href: '/base/app/dashboards#/view/..%2F..%2Fother%3Fx%3D1%23y',
      });
    });

    it.each(['https://evil.example', '//evil.example', '/x/..\\..', 'a b&c=d'])(
      'writes a value such as %p as one part of the path',
      (hostile) => {
        const link = resolve(
          { type: 'app', app: 'dashboards', path: '/{{state.v}}' },
          { state: { v: hostile } }
        );

        expect(link.status).toBe('ready');
        if (link.status === 'ready') {
          expect(link.href.startsWith('/base/app/dashboards/')).toBe(true);
          const written = link.href.slice('/base/app/dashboards/'.length);
          expect(written).not.toMatch(/[/?#\\ &]/);
          expect(decodeURIComponent(written)).toBe(hostile);
        }
      }
    );

    it('writes a list as its values, each safe, separated by commas', () => {
      expect(
        resolve(
          { type: 'app', app: 'dashboards', path: '?users={{state.users}}' },
          { state: { users: ['a b', 'c/d'] } }
        )
      ).toMatchObject({ href: '/base/app/dashboards?users=a%20b,c%2Fd' });
    });

    it('writes numbers and true and false as they are', () => {
      expect(
        resolve(
          { type: 'app', app: 'dashboards', path: '/{{state.n}}/{{state.b}}' },
          { state: { n: 5, b: true } }
        )
      ).toMatchObject({ href: '/base/app/dashboards/5/true' });
    });

    it('is not offered when the person cannot open the application, or it is not there', () => {
      expect(resolve({ type: 'app', app: 'hidden' })).toMatchObject({
        status: 'unavailable',
        reason: 'This page is not available to you, or not in this space.',
      });
      expect(resolve({ type: 'app', app: 'nope' })).toMatchObject({ status: 'unavailable' });
    });
  });

  describe('to another custom app', () => {
    it('is the page of that app, with its id as one part of the path', () => {
      const link = resolve({ type: 'custom_app', id: 'a/b' });

      expect(link).toMatchObject({ status: 'ready', href: '/base/app/customApp/view/a%2Fb' });
      if (link.status === 'ready') link.navigate();
      expect(navigateToApp).toHaveBeenCalledWith('customApp', { path: '/view/a%2Fb' });
    });
  });

  describe('to the query of a component in Discover', () => {
    it('opens the query with its values written in, for the period of the app', () => {
      const link = resolve(
        { type: 'discover', from: 'rows' },
        { queryValues: { service: 'checkout', users: ['alice', 'bob'] } }
      );

      const expected = {
        query: {
          esql: 'FROM logs | WHERE service == "checkout" AND u IN ("alice", "bob") | LIMIT 5',
        },
        timeRange: { from: 'now-7d', to: 'now' },
      };
      expect(link).toMatchObject({ status: 'ready' });
      expect(getRedirectUrl).toHaveBeenCalledWith(expected);
      if (link.status === 'ready') link.navigate();
      expect(navigate).toHaveBeenCalledWith(expected);
    });

    it('writes a value that tries to be query as a text, and nothing more', () => {
      resolve(
        { type: 'discover', from: 'rows' },
        { queryValues: { service: '" | DROP logs | WHERE x == "', users: [] } }
      );

      const { query } = getRedirectUrl.mock.calls[0][0] as { query: { esql: string } };
      expect(query.esql).toBe(
        'FROM logs | WHERE service == "\\" | DROP logs | WHERE x == \\"" AND u IN (null) | LIMIT 5'
      );
    });

    it('is not offered when Discover is not there', () => {
      expect(resolve({ type: 'discover', from: 'rows' }, { withShare: false })).toMatchObject({
        status: 'unavailable',
        reason: 'Discover is not available.',
      });
    });

    it('is not offered for something that has no ES|QL query, or that is not there', () => {
      expect(resolve({ type: 'discover', from: 'cases' })).toMatchObject({
        status: 'unavailable',
        reason: 'This query cannot be opened in Discover.',
      });
      expect(resolve({ type: 'discover', from: 'nope' })).toMatchObject({ status: 'unavailable' });
    });
  });
});
