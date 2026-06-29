/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockConnectorType } from '../../../../../application/connector/mocks';
import { transformListTypesResponse } from './v1';

describe('transformListTypesResponse', () => {
  it('includes testable in the wire response', () => {
    const results = [
      createMockConnectorType({ id: 'testable-connector', testable: true }),
      createMockConnectorType({ id: 'non-testable-connector', testable: false }),
    ];

    expect(transformListTypesResponse(results)).toEqual([
      expect.objectContaining({ id: 'testable-connector', testable: true }),
      expect.objectContaining({ id: 'non-testable-connector', testable: false }),
    ]);
  });
});
