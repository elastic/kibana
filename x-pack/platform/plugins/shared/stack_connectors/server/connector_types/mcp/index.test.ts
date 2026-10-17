/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentBuilderConnectorFeatureId } from '@kbn/actions-plugin/common';
import { getMcpConnectorType } from '.';

describe('getMcpConnectorType', () => {
  it('does not support the Agent Builder connector feature', () => {
    const connectorType = getMcpConnectorType({ getClientLeasePool: jest.fn() });

    // MCP v1 can't be used as a generic agent tool. Agent Builder's connector
    // pickers rely on this being absent to keep it out of their compatible-types list.
    expect(connectorType.supportedFeatureIds).not.toContain(AgentBuilderConnectorFeatureId);
  });
});
