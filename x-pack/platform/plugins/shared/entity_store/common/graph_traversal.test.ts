/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_GRAPH_TRAVERSAL_SCENARIO_ID,
  getDefaultGraphTraversalScenarioId,
  HOST_GRAPH_TRAVERSAL_SCENARIO_ID,
} from './graph_traversal';

describe('getDefaultGraphTraversalScenarioId', () => {
  it('runs the endpoint scenario for a host seed', () => {
    expect(getDefaultGraphTraversalScenarioId('host:WKSTN-RECV01')).toBe(
      HOST_GRAPH_TRAVERSAL_SCENARIO_ID
    );
  });

  it('runs the Okta scenario for any other seed', () => {
    expect(getDefaultGraphTraversalScenarioId('user:john.doe@acmecrm.com@okta')).toBe(
      DEFAULT_GRAPH_TRAVERSAL_SCENARIO_ID
    );
    expect(getDefaultGraphTraversalScenarioId('arn:aws:iam::1:role/x')).toBe(
      DEFAULT_GRAPH_TRAVERSAL_SCENARIO_ID
    );
  });
});
