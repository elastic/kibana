/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock } from '@kbn/core/server/mocks';

import type { License } from '../../../services';

import {
  areCrossProjectFeatureFlagsEnabled,
  isNodes,
  routeHandlerFactory,
} from './route_handler_factory';

describe('Transform: Nodes API endpoint', () => {
  test('isNodes()', () => {
    expect(isNodes(undefined)).toBe(false);
    expect(isNodes({})).toBe(false);
    expect(isNodes({ nodeId: {} })).toBe(false);
    expect(isNodes({ nodeId: { someAttribute: {} } })).toBe(false);
    expect(isNodes({ nodeId: { attributes: {} } })).toBe(false);
    expect(
      isNodes({
        nodeId1: { attributes: { someAttribute: true } },
        nodeId2: { someAttribute: 'asdf' },
      })
    ).toBe(false);

    // Legacy format based on attributes should return false
    expect(isNodes({ nodeId: { attributes: { someAttribute: true } } })).toBe(false);
    expect(
      isNodes({
        nodeId1: { attributes: { someAttribute: true } },
        nodeId2: { attributes: { 'transform.node': 'true' } },
      })
    ).toBe(false);

    // Current format based on roles should return true
    expect(isNodes({ nodeId: { roles: ['master', 'transform'] } })).toBe(true);
    expect(isNodes({ nodeId: { roles: ['transform'] } })).toBe(true);
    expect(
      isNodes({
        nodeId1: { roles: ['master', 'data'] },
        nodeId2: { roles: ['transform'] },
      })
    ).toBe(true);
  });

  test('requires both cross-project feature flags on every Elasticsearch node', () => {
    const enabledJvmArguments = [
      '-Des.transform_cross_project_feature_flag_enabled=true',
      '-Des.ml_cross_project_feature_flag_enabled=true',
    ];

    expect(
      areCrossProjectFeatureFlagsEnabled(
        {
          nodeId1: { jvm: { input_arguments: enabledJvmArguments }, roles: ['master'] },
          nodeId2: { jvm: { input_arguments: enabledJvmArguments }, roles: ['transform'] },
        },
        false
      )
    ).toBe(true);
    expect(
      areCrossProjectFeatureFlagsEnabled(
        {
          nodeId1: { jvm: { input_arguments: enabledJvmArguments }, roles: ['master'] },
          nodeId2: {
            jvm: {
              input_arguments: ['-Des.transform_cross_project_feature_flag_enabled=true'],
            },
            roles: ['transform'],
          },
        },
        false
      )
    ).toBe(false);
    expect(
      areCrossProjectFeatureFlagsEnabled(
        {
          nodeId: {
            jvm: {
              input_arguments: [
                '-Des.transform_cross_project_feature_flag_enabled=true',
                '-Des.ml_cross_project_feature_flag_enabled=false',
              ],
            },
            roles: ['transform'],
          },
        },
        false
      )
    ).toBe(false);
  });

  test('uses the Elasticsearch feature flag defaults for snapshot builds', () => {
    const nodesWithoutFeatureFlagArguments = {
      nodeId: { jvm: { input_arguments: [] }, roles: ['transform'] },
    };

    expect(areCrossProjectFeatureFlagsEnabled(nodesWithoutFeatureFlagArguments, true)).toBe(true);
    expect(areCrossProjectFeatureFlagsEnabled(nodesWithoutFeatureFlagArguments, false)).toBe(false);
    expect(
      areCrossProjectFeatureFlagsEnabled(
        {
          nodeId: {
            jvm: {
              input_arguments: ['-Des.transform_cross_project_feature_flag_enabled=false'],
            },
            roles: ['transform'],
          },
        },
        true
      )
    ).toBe(false);
  });

  test('requests JVM arguments and returns the cross-project capability', async () => {
    const coreContext = coreMock.createRequestHandlerContext();
    const context = coreMock.createCustomRequestHandlerContext({ core: coreContext });
    const response = httpServerMock.createResponseFactory();
    const nodesInfo = coreContext.elasticsearch.client.asInternalUser.nodes
      .info as unknown as jest.Mock;
    const clusterInfo = coreContext.elasticsearch.client.asInternalUser
      .info as unknown as jest.Mock;

    nodesInfo.mockResolvedValue({
      nodes: {
        nodeId: {
          jvm: {
            input_arguments: [
              '-Des.transform_cross_project_feature_flag_enabled=true',
              '-Des.ml_cross_project_feature_flag_enabled=true',
            ],
          },
          roles: ['transform'],
        },
      },
    } as any);
    clusterInfo.mockResolvedValue({
      version: { build_snapshot: false },
    } as any);

    await routeHandlerFactory({
      getStatus: () => ({ isSecurityEnabled: false }),
    } as License)(
      context,
      httpServerMock.createKibanaRequest({
        method: 'get',
        path: '/internal/transform/transforms/_nodes',
      }),
      response
    );

    expect(nodesInfo).toHaveBeenCalledWith({
      filter_path: 'nodes.*.roles,nodes.*.jvm.input_arguments',
    });
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        count: 1,
        isCrossProjectEnabled: true,
      },
    });
  });
});
