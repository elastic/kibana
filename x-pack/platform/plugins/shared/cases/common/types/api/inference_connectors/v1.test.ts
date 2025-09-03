/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceConnectorsRequestRt, InferenceConnectorsResponseRt } from './v1';

describe('Inference connectors', () => {
  describe('InferenceConnectorsRequestRt', () => {
    const defaultRequest = {};

    it('has expected attributes in request', () => {
      const query = InferenceConnectorsRequestRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = InferenceConnectorsRequestRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('InferenceConnectorsResponseRt', () => {
    const defaultResponse = {
      connectors: [
        {
          connectorId: 'connector-id',
        },
      ],
    };

    it('has expected attributes in response', () => {
      const query = InferenceConnectorsResponseRt.decode(defaultResponse);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultResponse,
      });
    });

    it('removes foo:bar attributes from response', () => {
      const query = InferenceConnectorsResponseRt.decode({ ...defaultResponse, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultResponse,
      });
    });
  });
});
