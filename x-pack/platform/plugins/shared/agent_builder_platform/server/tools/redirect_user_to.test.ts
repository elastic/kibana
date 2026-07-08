/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decode } from '@kbn/rison';
import { loggerMock } from '@kbn/logging-mocks';
import { ToolResultType } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import type { CoreSetup } from '@kbn/core-lifecycle-server';
import { redirectUserToTool, redirectUserToSchema } from './redirect_user_to';

const SERVER_BASE_PATH = '/kbn';
const SPACE_ID = 'space-a';
const PREFIX = `${SERVER_BASE_PATH}/s/${SPACE_ID}`;

const coreSetup = {
  getStartServices: jest
    .fn()
    .mockResolvedValue([{ http: { basePath: { serverBasePath: SERVER_BASE_PATH } } }, {}]),
} as unknown as CoreSetup;

const context = { logger: loggerMock.create(), spaceId: SPACE_ID } as never;

/** Decodes the `flyout` query param back into its state object (percent-decode + rison decode). */
const decodeFlyout = (url: string) => {
  const param = new URLSearchParams(url.split('?')[1]).get('flyout');
  if (param == null) throw new Error('no flyout param in url');
  return decode(param) as { left?: unknown; right?: unknown; preview?: unknown };
};

describe('redirectUserToTool', () => {
  describe('base path + space prefixing', () => {
    it('prefixes an app-relative path with the base path and active space', async () => {
      const { results } = (await redirectUserToTool(coreSetup).handler(
        { path: '/app/security/entity_analytics_management/risk_score' },
        context
      )) as ToolHandlerStandardReturn;
      expect((results[0].data as { url: string }).url).toBe(
        `${PREFIX}/app/security/entity_analytics_management/risk_score`
      );
    });

    it('preserves a query string already present on the path', async () => {
      const { results } = (await redirectUserToTool(coreSetup).handler(
        { path: '/app/security/alerts?query=foo' },
        context
      )) as ToolHandlerStandardReturn;
      expect((results[0].data as { url: string }).url).toBe(
        `${PREFIX}/app/security/alerts?query=foo`
      );
    });
  });

  describe('path validation', () => {
    it.each(['app/security', 'http://evil.com', 'https://evil.com', '//evil.com'])(
      'returns an error result for a non app-relative path: %s',
      async (path) => {
        const { results } = (await redirectUserToTool(coreSetup).handler(
          { path },
          context
        )) as ToolHandlerStandardReturn;
        expect(results[0].type).toBe(ToolResultType.error);
        expect((results[0].data as { message: string }).message).toContain('app-relative');
      }
    );
  });

  describe('flyout serialization', () => {
    it('appends a rison-encoded flyout query param that round-trips', async () => {
      const flyout = {
        right: { id: 'watchlists-flyout', params: { mode: 'edit', watchlistId: 'wl-123' } },
      };
      const { results } = (await redirectUserToTool(coreSetup).handler(
        { path: '/app/security/entity_analytics_management/watchlists', flyout },
        context
      )) as ToolHandlerStandardReturn;
      const { url } = results[0].data as { url: string };
      expect(
        url.startsWith(`${PREFIX}/app/security/entity_analytics_management/watchlists?flyout=`)
      ).toBe(true);
      expect(decodeFlyout(url)).toEqual(flyout);
    });

    it('joins the flyout param with "&" when the path already has a query string', async () => {
      const { results } = (await redirectUserToTool(coreSetup).handler(
        {
          path: '/app/security/entity_analytics_home_page?foo=bar',
          flyout: { right: { id: 'host-panel', params: { entityId: 'host:abc' } } },
        },
        context
      )) as ToolHandlerStandardReturn;
      const { url } = results[0].data as { url: string };
      expect(url).toContain('?foo=bar&flyout=');
      expect((decodeFlyout(url).right as { id: string }).id).toBe('host-panel');
    });

    it('does not append a flyout param when flyout has no panels', async () => {
      const { results } = (await redirectUserToTool(coreSetup).handler(
        { path: '/app/security', flyout: {} },
        context
      )) as ToolHandlerStandardReturn;
      expect((results[0].data as { url: string }).url).toBe(`${PREFIX}/app/security`);
    });

    it('round-trips left/right/preview panels and their params', async () => {
      const flyout = {
        left: { id: 'user_details', params: { path: { tab: 'resolution_group' } } },
        right: { id: 'user-panel', params: { entityId: 'user:jsmith123' } },
        preview: [{ id: 'rule-preview', params: { ruleId: 'r-1' } }],
      };
      const { results } = (await redirectUserToTool(coreSetup).handler(
        { path: '/app/security', flyout },
        context
      )) as ToolHandlerStandardReturn;
      expect(decodeFlyout((results[0].data as { url: string }).url)).toEqual(flyout);
    });

    it('leaves no raw markdown-breaking chars in the url for a rison-quoted id', async () => {
      // `: @ .` force rison to single-quote the value → would emit ( ) ' unless we escape them.
      // The whole url is dropped inside a markdown link `[title](url)`, so it must carry none.
      const { results } = (await redirectUserToTool(coreSetup).handler(
        {
          path: '/app/security/entity_analytics_home_page',
          flyout: {
            right: { id: 'user-panel', params: { entityId: 'user:idp-008@example.com@okta' } },
          },
        },
        context
      )) as ToolHandlerStandardReturn;
      const { url } = results[0].data as { url: string };
      expect(url).not.toMatch(/[()']/);
      expect((decodeFlyout(url).right as { params: { entityId: string } }).params.entityId).toBe(
        'user:idp-008@example.com@okta'
      );
    });

    it('encodes a space as %20 (not "+") so it decodes back to a space', async () => {
      const { results } = (await redirectUserToTool(coreSetup).handler(
        {
          path: '/app/security',
          flyout: { right: { id: 'host-panel', params: { hostName: 'my server prod' } } },
        },
        context
      )) as ToolHandlerStandardReturn;
      const { url } = results[0].data as { url: string };
      expect(url).toContain('%20');
      expect(url).not.toContain('+');
      expect((decodeFlyout(url).right as { params: { hostName: string } }).params.hostName).toBe(
        'my server prod'
      );
    });
  });
});

describe('redirectUserToSchema', () => {
  it('requires a path', () => {
    expect(redirectUserToSchema.safeParse({}).success).toBe(false);
  });

  it('accepts a bare path', () => {
    expect(redirectUserToSchema.safeParse({ path: '/app/security' }).success).toBe(true);
  });

  it('accepts a path with a flyout state', () => {
    expect(
      redirectUserToSchema.safeParse({
        path: '/app/security',
        flyout: { right: { id: 'watchlists-flyout', params: { watchlistId: 'wl-1' } } },
      }).success
    ).toBe(true);
  });

  it('rejects a flyout panel without an id', () => {
    expect(
      redirectUserToSchema.safeParse({ path: '/app/security', flyout: { right: { params: {} } } })
        .success
    ).toBe(false);
  });
});
