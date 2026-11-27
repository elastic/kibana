/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerBulkCreateWorkflowsRoute } from './bulk_create_workflows';
import type { WorkflowsManagementConfig } from '../../../config';
import type { RouteDependencies } from '../types';

const registerAndGetRouteOptions = (importConfig: WorkflowsManagementConfig['import']) => {
  const post = jest.fn().mockReturnValue({ addVersion: jest.fn() });
  registerBulkCreateWorkflowsRoute({
    router: { versioned: { post } },
    config: { import: importConfig },
  } as unknown as RouteDependencies);
  return post.mock.calls[0][0].options;
};

describe('registerBulkCreateWorkflowsRoute request size limit', () => {
  it('leaves the global server.maxPayload in effect when no import limit is configured', () => {
    expect(registerAndGetRouteOptions({})).not.toHaveProperty('body');
  });

  it('applies the configured import limit to the route', () => {
    const maxPayloadBytes = 5 * 1024 * 1024;

    expect(registerAndGetRouteOptions({ maxPayloadBytes }).body).toEqual({
      maxBytes: maxPayloadBytes,
    });
  });
});
