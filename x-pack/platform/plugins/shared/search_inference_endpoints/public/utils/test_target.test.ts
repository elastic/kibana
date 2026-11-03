/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTestTargetName, getTestTargetVariables } from './test_target';

describe('test target helpers', () => {
  const endpoint = { inferenceId: 'my-endpoint' };
  const feature = { featureId: 'agent_builder', featureName: 'Agent Builder' };
  const connector = { connectorId: 'my-connector', connectorName: 'My connector' };

  it('keeps only the id of the target as request variables', () => {
    expect(getTestTargetVariables(endpoint)).toEqual({ inferenceId: 'my-endpoint' });
    expect(getTestTargetVariables(feature)).toEqual({ featureId: 'agent_builder' });
    expect(getTestTargetVariables(connector)).toEqual({ connectorId: 'my-connector' });
  });

  it('names the target for the modal title', () => {
    expect(getTestTargetName(endpoint)).toBe('my-endpoint');
    expect(getTestTargetName(feature)).toBe('Agent Builder');
    expect(getTestTargetName(connector)).toBe('My connector');
  });
});
