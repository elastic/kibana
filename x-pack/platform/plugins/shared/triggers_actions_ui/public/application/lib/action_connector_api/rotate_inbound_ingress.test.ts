/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { rotateInboundIngress } from './rotate_inbound_ingress';

const http = httpServiceMock.createStartContract();

beforeEach(() => jest.resetAllMocks());

describe('rotateInboundIngress', () => {
  it('posts the internal rotate path with an encoded id and returns ingestToken', async () => {
    http.post.mockResolvedValueOnce({ ingest_token: 'rotated-token' });

    const result = await rotateInboundIngress({ http, id: 'sales/ingress' });

    expect(result).toEqual({ ingestToken: 'rotated-token' });
    expect(http.post).toHaveBeenCalledWith(
      '/internal/actions/connector/sales%2Fingress/_rotate_event_token'
    );
  });

  it('throws when the response omits ingest_token', async () => {
    http.post.mockResolvedValueOnce({});

    await expect(rotateInboundIngress({ http, id: 'sales-ingress' })).rejects.toThrow(
      'Rotate did not return an ingest token.'
    );
  });
});
