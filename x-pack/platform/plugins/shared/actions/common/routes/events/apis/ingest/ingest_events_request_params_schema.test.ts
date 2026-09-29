/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ingestEventsRequestParamsSchemaV1 } from '.';

describe('ingestEventsRequestParamsSchemaV1', () => {
  it('accepts snake_case path params', () => {
    expect(
      ingestEventsRequestParamsSchemaV1.validate({
        connector_type_id: 'webhook',
        connector_id: 'abc',
      })
    ).toEqual({
      connector_type_id: 'webhook',
      connector_id: 'abc',
    });
  });

  it('rejects empty connector_id', () => {
    expect(() =>
      ingestEventsRequestParamsSchemaV1.validate({
        connector_type_id: 'webhook',
        connector_id: '',
      })
    ).toThrow();
  });
});
