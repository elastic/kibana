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
  // Raw headers: what Core's ES client scoping reads (ensureRawRequest), not the filtered view.
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

const isHeaderValue = (value: unknown): value is string | string[] =>
  typeof value === 'string' ||
  (Array.isArray(value) && value.every((item) => typeof item === 'string'));

/** Rebuilds the fake request with Core's own factory (same as alerting/actions task runners). */
export const decodeFakeRequest = (descriptor: FakeRequestDescriptor): KibanaRequest => {
  if (!descriptor || typeof descriptor !== 'object' || Array.isArray(descriptor)) {
    throw new Error('t7a request codec: bad descriptor');
  }
  if (descriptor.kind !== 't7a-fake-request') throw new Error('t7a request codec: bad descriptor');
  if (typeof descriptor.externalUiam !== 'boolean') {
    throw new Error('t7a request codec: externalUiam must be boolean');
  }
  if (descriptor.spaceId !== undefined && typeof descriptor.spaceId !== 'string') {
    throw new Error('t7a request codec: spaceId must be a string');
  }
  if (
    !descriptor.headers ||
    typeof descriptor.headers !== 'object' ||
    Array.isArray(descriptor.headers)
  ) {
    throw new Error('t7a request codec: headers must be an object');
  }
  for (const value of Object.values(descriptor.headers)) {
    if (!isHeaderValue(value)) throw new Error('t7a request codec: bad header');
  }
  const request = kibanaRequestFactory({
    headers: descriptor.headers,
    ...(descriptor.spaceId ? { spaceId: brandSpaceId(descriptor.spaceId) } : {}),
  });
  if (descriptor.externalUiam) markExternalUiamCredential(request);
  return request;
};

/**
 * Argument index of the options bag whose `request` field is a fake KibanaRequest.
 * Task params and state are not on this list and are never revived.
 */
const TASK_MANAGER_REQUEST_ARGUMENT: Readonly<Record<string, number>> = {
  schedule: 1,
  bulkSchedule: 1,
  ensureScheduled: 1,
  bulkDisable: 2,
  bulkEnable: 2,
  bulkUpdateSchedules: 2,
  bulkUpdateState: 2,
};

/**
 * Revives a fake request only at the Task Manager options position for `method`.
 * A `kind: t7a-fake-request` object inside params or state stays a plain object.
 */
export const reviveTaskManagerArgs = (method: string, args: unknown): unknown[] => {
  if (!Array.isArray(args)) throw new Error('t7a request codec: task manager args must be a list');
  const index = TASK_MANAGER_REQUEST_ARGUMENT[method];
  if (index === undefined) return args.slice();
  const options = args[index];
  if (
    !options ||
    typeof options !== 'object' ||
    Array.isArray(options) ||
    !('request' in options)
  ) {
    return args.slice();
  }
  const request = (options as { request?: unknown }).request;
  if (request === undefined) return args.slice();
  const next = args.slice();
  next[index] = {
    ...(options as Record<string, unknown>),
    request: decodeFakeRequest(request as FakeRequestDescriptor),
  };
  return next;
};
