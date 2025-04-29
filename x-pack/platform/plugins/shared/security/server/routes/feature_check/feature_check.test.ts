/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import type { LicenseCheck } from '@kbn/licensing-plugin/server';

import { defineSecurityFeatureCheckRoute } from './feature_check';
import { routeDefinitionParamsMock } from '../index.mock';

interface TestOptions {
  licenseCheckResult?: LicenseCheck;
  canReadSecurity?: boolean;
  nodeSettingsResponse?: () => Record<string, any>;
  xpackUsageResponse?: () => Record<string, any>;
  asserts: { statusCode: number; result?: Record<string, any> };
}

const defaultXpackUsageResponse = {
  remote_clusters: {
    size: 0,
  },
  security: {
    realms: {
      native: {
        available: true,
        enabled: true,
      },
      pki: {
        available: true,
        enabled: true,
      },
    },
  },
};

describe('GET role mappings feature check', () => {
  const getFeatureCheckTest = (
    description: string,
    {
      licenseCheckResult = { state: 'valid' },
      canReadSecurity = true,
      nodeSettingsResponse = () => ({}),
      xpackUsageResponse = () => defaultXpackUsageResponse,
      asserts,
    }: TestOptions
  ) => {
    test(description, async () => {
      const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
      const mockCoreContext = coreMock.createRequestHandlerContext();
      const mockLicensingContext = {
        license: {
          check: jest.fn().mockReturnValue(licenseCheckResult),
        },
      } as any;
      const mockContext = coreMock.createCustomRequestHandlerContext({
        core: mockCoreContext,
        licensing: mockLicensingContext,
      });

      mockCoreContext.elasticsearch.client.asInternalUser.nodes.info.mockImplementation((async () =>
        nodeSettingsResponse()) as any);
      mockCoreContext.elasticsearch.client.asInternalUser.transport.request.mockImplementation(
        (async () => xpackUsageResponse()) as any
      );
      mockCoreContext.elasticsearch.client.asCurrentUser.security.hasPrivileges.mockResolvedValue({
        has_all_requested: canReadSecurity,
      } as any);

      defineSecurityFeatureCheckRoute(mockRouteDefinitionParams);
      const [[, handler]] = mockRouteDefinitionParams.router.get.mock.calls;

      const headers = { authorization: 'foo' };
      const mockRequest = httpServerMock.createKibanaRequest({
        method: 'get',
        path: `/internal/security/_check_security_features`,
        headers,
      });

      const response = await handler(mockContext, mockRequest, kibanaResponseFactory);
      expect(response.status).toBe(asserts.statusCode);
      expect(response.payload).toEqual(asserts.result);

      expect(mockLicensingContext.license.check).toHaveBeenCalledWith('security', 'basic');

      if (canReadSecurity) {
        expect(
          mockCoreContext.elasticsearch.client.asInternalUser.transport.request
        ).toHaveBeenCalledWith({
          method: 'GET',
          path: '/_xpack/usage?filter_path=remote_clusters.*,security.realms.*',
        });
      }
    });
  };

  getFeatureCheckTest('allows both script types with the default settings', {
    asserts: {
      statusCode: 200,
      result: {
        canReadSecurity: true,
        canUseInlineScripts: true,
        canUseStoredScripts: true,
        hasCompatibleRealms: true,
        canUseRemoteIndices: true,
        canUseRemoteClusters: true,
      },
    },
  });

  getFeatureCheckTest('allows both script types when explicitly enabled', {
    nodeSettingsResponse: () => ({
      nodes: {
        someNodeId: {
          settings: {
            script: {
              allowed_types: ['stored', 'inline'],
            },
          },
        },
      },
    }),
    asserts: {
      statusCode: 200,
      result: {
        canReadSecurity: true,
        canUseInlineScripts: true,
        canUseStoredScripts: true,
        hasCompatibleRealms: true,
        canUseRemoteIndices: true,
        canUseRemoteClusters: true,
      },
    },
  });

  getFeatureCheckTest(
    'indicates canUseRemoteIndices=false when cluster does not support remote indices',
    {
      xpackUsageResponse: () => ({
        ...defaultXpackUsageResponse,
        remote_clusters: undefined,
      }),
      asserts: {
        statusCode: 200,
        result: {
          canReadSecurity: true,
          canUseInlineScripts: true,
          canUseStoredScripts: true,
          hasCompatibleRealms: true,
          canUseRemoteIndices: false,
          canUseRemoteClusters: false,
        },
      },
    }
  );

  getFeatureCheckTest('disallows stored scripts when disabled', {
    nodeSettingsResponse: () => ({
      nodes: {
        someNodeId: {
          settings: {
            script: {
              allowed_types: ['inline'],
            },
          },
        },
      },
    }),
    asserts: {
      statusCode: 200,
      result: {
        canReadSecurity: true,
        canUseInlineScripts: true,
        canUseStoredScripts: false,
        hasCompatibleRealms: true,
        canUseRemoteIndices: true,
        canUseRemoteClusters: true,
      },
    },
  });

  getFeatureCheckTest('disallows inline scripts when disabled', {
    nodeSettingsResponse: () => ({
      nodes: {
        someNodeId: {
          settings: {
            script: {
              allowed_types: ['stored'],
            },
          },
        },
      },
    }),
    asserts: {
      statusCode: 200,
      result: {
        canReadSecurity: true,
        canUseInlineScripts: false,
        canUseStoredScripts: true,
        hasCompatibleRealms: true,
        canUseRemoteIndices: true,
        canUseRemoteClusters: true,
      },
    },
  });

  getFeatureCheckTest('indicates incompatible realms when only native and file are enabled', {
    xpackUsageResponse: () => ({
      ...defaultXpackUsageResponse,
      security: {
        realms: {
          native: {
            available: true,
            enabled: true,
          },
          file: {
            available: true,
            enabled: true,
          },
        },
      },
    }),
    asserts: {
      statusCode: 200,
      result: {
        canReadSecurity: true,
        canUseInlineScripts: true,
        canUseStoredScripts: true,
        hasCompatibleRealms: false,
        canUseRemoteIndices: true,
        canUseRemoteClusters: true,
      },
    },
  });

  getFeatureCheckTest('indicates canReadSecurity=false for users without `read_security`', {
    canReadSecurity: false,
    asserts: {
      statusCode: 200,
      result: {
        canReadSecurity: false,
      },
    },
  });

  getFeatureCheckTest(
    'falls back to allowing both script types if there is an error retrieving node settings',
    {
      nodeSettingsResponse: () => {
        throw new Error('something bad happened');
      },
      xpackUsageResponse: () => {
        throw new Error('something bad happened');
      },
      asserts: {
        statusCode: 200,
        result: {
          canReadSecurity: true,
          canUseInlineScripts: true,
          canUseStoredScripts: true,
          hasCompatibleRealms: false,
          canUseRemoteIndices: false,
          canUseRemoteClusters: false,
        },
      },
    }
  );
});
