/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* RESEARCH ONLY (Track 7.A). Codec for FAKE (task) KibanaRequests only.
 * Background runners build fake requests from headers + a branded space id; that is all the state
 * they carry, so they can be rebuilt on the other side with Core's own factory. Real HTTP requests
 * (auth state, route, socket) are deliberately NOT supported and fail closed.
 */

import { brandSpaceId } from '@kbn/core-spaces-common';
import type { Headers, KibanaRequest } from '@kbn/core-http-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { ensureRawRequest } from '@kbn/core-http-router-server-internal';
import { isExternalUiamCredential, markExternalUiamCredential } from '@kbn/core-security-server';

export interface FakeRequestDescriptor {
  readonly kind: 't7a-fake-request';
  readonly headers: Record<string, string | string[]>;
  readonly spaceId?: string;
  readonly externalUiam: boolean;
}

/** Encodes a fake request; throws for anything that looks like a real HTTP request. */
export const encodeFakeRequest = (request: KibanaRequest): FakeRequestDescriptor => {
  if (!request.isFakeRequest) throw new Error('t7a request codec: only fake requests can cross');
  const headers: Record<string, string | string[]> = {};
  // Raw headers: KibanaRequest.headers strips secret headers (authorization) by design.
  for (const [key, value] of Object.entries(ensureRawRequest(request).headers as Headers)) {
    if (typeof value === 'string' || Array.isArray(value)) headers[key] = value;
  }
  return {
    kind: 't7a-fake-request',
    headers,
    spaceId: (request as KibanaRequest & { spaceId?: string }).spaceId,
    externalUiam: isExternalUiamCredential(request),
  };
};

/** Rebuilds the fake request with Core's own factory (same as alerting/actions task runners). */
export const decodeFakeRequest = (descriptor: FakeRequestDescriptor): KibanaRequest => {
  if (descriptor?.kind !== 't7a-fake-request') throw new Error('t7a request codec: bad descriptor');
  const request = kibanaRequestFactory({
    headers: descriptor.headers,
    ...(descriptor.spaceId ? { spaceId: brandSpaceId(descriptor.spaceId) } : {}),
  });
  if (descriptor.externalUiam) markExternalUiamCredential(request);
  return request;
};
