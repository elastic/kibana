/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_NODE_CONNECTIONS } from '../../../../../../common/constants';
import { validateNodeConnections } from './validate_node_connections';

describe('validateNodeConnections', () => {
  test('rejects numbers larger than MaxValue', () => {
    expect(validateNodeConnections(MAX_NODE_CONNECTIONS + 1)).toMatchSnapshot();
  });

  test('accepts numbers equal than MaxValue', () => {
    expect(validateNodeConnections(MAX_NODE_CONNECTIONS)).toBe(null);
  });

  test('accepts numbers smaller than MaxValue', () => {
    expect(validateNodeConnections(MAX_NODE_CONNECTIONS - 1)).toBe(null);
  });
});
