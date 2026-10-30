/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';

import {
  getProtectedResource,
  getProtectedResourceMetadataUrl,
  getRequestSpacePrefix,
  resolveProtectedResource,
} from './oauth_protected_resource';

const RESOURCE_ORIGIN = 'https://kibana.example.com:9243';
const CONFIGURED_RESOURCE = `${RESOURCE_ORIGIN}/api/agent_builder/mcp`;

const SPACE_RESOURCES = [
  ['', CONFIGURED_RESOURCE],
  ['/s/marketing', `${RESOURCE_ORIGIN}/s/marketing/api/agent_builder/mcp`],
  ['/s/default', `${RESOURCE_ORIGIN}/s/default/api/agent_builder/mcp`],
] as const;

describe('getRequestSpacePrefix', () => {
  describe.each(['', '/kibana'])('with server base path "%s"', (serverBasePath) => {
    it.each(['', '/s/marketing', '/s/default'])(
      'returns the literal space prefix "%s"',
      (spacePrefix) => {
        const basePath = httpServiceMock.createBasePath(serverBasePath);
        const request = httpServerMock.createKibanaRequest();
        basePath.get.mockReturnValue(`${serverBasePath}${spacePrefix}`);

        expect(getRequestSpacePrefix(basePath, request)).toBe(spacePrefix);
        expect(basePath.get).toHaveBeenCalledWith(request);
      }
    );
  });
});

describe('getProtectedResource', () => {
  it.each(SPACE_RESOURCES)('builds the resource for space prefix "%s"', (spacePrefix, resource) => {
    expect(getProtectedResource(CONFIGURED_RESOURCE, spacePrefix)).toBe(resource);
  });

  it('preserves the full configured resource pathname', () => {
    expect(
      getProtectedResource(`${RESOURCE_ORIGIN}/kibana/api/agent_builder/mcp`, '/s/marketing')
    ).toBe(`${RESOURCE_ORIGIN}/s/marketing/kibana/api/agent_builder/mcp`);
  });

  it.each(['', '/s/marketing'])('handles a root resource with space prefix "%s"', (spacePrefix) => {
    expect(getProtectedResource(RESOURCE_ORIGIN, spacePrefix)).toBe(
      `${RESOURCE_ORIGIN}${spacePrefix}/`
    );
  });
});

describe('getProtectedResourceMetadataUrl', () => {
  it.each(SPACE_RESOURCES)(
    'inserts the well-known segment before the resource path for "%s"',
    (spacePrefix, resource) => {
      expect(getProtectedResourceMetadataUrl(resource)).toBe(
        `${RESOURCE_ORIGIN}/.well-known/oauth-protected-resource${spacePrefix}/api/agent_builder/mcp`
      );
    }
  );

  it.each([RESOURCE_ORIGIN, `${RESOURCE_ORIGIN}/`])(
    'omits the trailing slash for root resource %s',
    (resource) => {
      expect(getProtectedResourceMetadataUrl(resource)).toBe(
        `${RESOURCE_ORIGIN}/.well-known/oauth-protected-resource`
      );
    }
  );
});

describe('resolveProtectedResource', () => {
  it.each(SPACE_RESOURCES)('resolves discovery for space prefix "%s"', (spacePrefix, resource) => {
    expect(
      resolveProtectedResource(CONFIGURED_RESOURCE, `${spacePrefix}/api/agent_builder/mcp`.slice(1))
    ).toBe(resource);
  });

  it.each([
    'other',
    's/marketing',
    's/marketing/other',
    'api/agent_builder/mcp/extra',
    'api/agent_builder/mcp/',
    's/marketing/api/agent_builder/mcp/',
    's/Marketing/api/agent_builder/mcp',
    's/marketing.other/api/agent_builder/mcp',
  ])('does not resolve an unrelated discovery path: %s', (discoveryPath) => {
    expect(resolveProtectedResource(CONFIGURED_RESOURCE, discoveryPath)).toBeUndefined();
  });

  it.each(SPACE_RESOURCES)(
    'round-trips the metadata URL for space prefix "%s"',
    (spacePrefix, resource) => {
      const metadataUrl = new URL(
        getProtectedResourceMetadataUrl(getProtectedResource(CONFIGURED_RESOURCE, spacePrefix))
      );
      const discoveryPath = metadataUrl.pathname.slice(
        '/.well-known/oauth-protected-resource/'.length
      );

      expect(resolveProtectedResource(CONFIGURED_RESOURCE, discoveryPath)).toBe(resource);
    }
  );
});
