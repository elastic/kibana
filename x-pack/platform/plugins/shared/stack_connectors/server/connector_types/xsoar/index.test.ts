/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { XSOARConnectorType } from '.';
import { getConnectorType } from '.';

let connectorType: XSOARConnectorType;

describe('XSOAR Connector', () => {
  beforeEach(() => {
    connectorType = getConnectorType();
  });
  test('exposes the connector as `XSOAR` with id `.xsoar`', () => {
    expect(connectorType.id).toEqual('.xsoar');
    expect(connectorType.name).toEqual('XSOAR');
  });
});
