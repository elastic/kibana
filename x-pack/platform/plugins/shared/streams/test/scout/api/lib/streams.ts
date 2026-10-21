/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, SamlAuth } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type {
  EffectiveFailureStore,
  FailureStore,
  WiredIngestStreamEffectiveFailureStore,
} from '@kbn/streams-schema';
import { Streams, emptyAssets, isEnabledFailureStore } from '@kbn/streams-schema';
import { PUBLIC_API_HEADERS } from '../fixtures/constants';
import type { StreamsTestApiService } from '../services/streams_api_service';

export interface StreamsTestContext {
  apiClient: ApiClientFixture;
  cookieHeader: Record<string, string>;
  streamsTest: StreamsTestApiService;
}

// Built-in admin, as in the FTR suites: the module's `streamsAdmin` role only covers `logs*`
// and these specs also manage `classic-fs-*` streams and ILM policies.
export const createAdminContext = async (
  apiClient: ApiClientFixture,
  samlAuth: SamlAuth,
  streamsTest: StreamsTestApiService
): Promise<StreamsTestContext> => {
  const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
  return { apiClient, cookieHeader, streamsTest };
};

type WiredIngest = Streams.WiredStream.UpsertRequest['stream']['ingest'];

export const wiredUpsertRequest = ({
  failureStore = { inherit: {} },
  routing = [],
  lifecycle = { inherit: {} },
  fields = {},
}: {
  failureStore?: FailureStore;
  routing?: WiredIngest['wired']['routing'];
  lifecycle?: WiredIngest['lifecycle'];
  fields?: WiredIngest['wired']['fields'];
} = {}): Streams.WiredStream.UpsertRequest => ({
  ...emptyAssets,
  stream: {
    type: 'wired',
    description: '',
    ingest: {
      lifecycle,
      settings: {},
      processing: { steps: [] },
      wired: { fields, routing },
      failure_store: failureStore,
    },
  },
});

export const classicUpsertRequest = (
  failureStore: FailureStore
): Streams.ClassicStream.UpsertRequest => ({
  ...emptyAssets,
  stream: {
    type: 'classic',
    description: '',
    ingest: {
      lifecycle: { inherit: {} },
      processing: { steps: [] },
      settings: {},
      classic: {},
      failure_store: failureStore,
    },
  },
});

// A grok pattern that never matches sends every document to the failure store.
export const failingClassicUpsertRequest = (): Streams.ClassicStream.UpsertRequest => {
  const request = classicUpsertRequest({ lifecycle: { enabled: {} } });
  request.stream.ingest.processing = {
    steps: [
      {
        action: 'grok',
        where: { always: {} },
        from: 'message',
        ignore_failure: false,
        patterns: ['non-matching-pattern'],
      },
    ],
  };
  return request;
};

export const putStream = (
  { apiClient, cookieHeader }: StreamsTestContext,
  streamName: string,
  body: Streams.all.UpsertRequest
) =>
  apiClient.put(`api/streams/${streamName}`, {
    headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
    body,
    responseType: 'json',
  });

export const getStream = ({ apiClient, cookieHeader }: StreamsTestContext, streamName: string) =>
  apiClient.get(`api/streams/${streamName}`, {
    headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
    responseType: 'json',
  });

// Re-submits the current wired definition (e.g. the `logs.otel` root) with a new failure store.
export const putWiredFailureStore = async (
  context: StreamsTestContext,
  streamName: string,
  failureStore: FailureStore
) => {
  const current = await getStream(context, streamName);
  expect(current).toHaveStatusCode(200);
  const { stream } = Streams.WiredStream.GetResponse.parse(current.body);
  const { updated_at: _, ...processing } = stream.ingest.processing;

  return putStream(context, streamName, {
    ...emptyAssets,
    stream: {
      type: 'wired',
      description: stream.description || '',
      ingest: { ...stream.ingest, processing, failure_store: failureStore },
    },
  });
};

export const expectFailureStore = async (
  context: StreamsTestContext,
  streamNames: string[],
  expected: EffectiveFailureStore | WiredIngestStreamEffectiveFailureStore
) => {
  for (const streamName of streamNames) {
    const response = await getStream(context, streamName);
    expect(response).toHaveStatusCode(200);
    expect(response.body.effective_failure_store).toStrictEqual(expected);
  }

  const dataStreamFailureStores = await context.streamsTest.getDataStreamFailureStore(streamNames);
  const expectedEnabled = isEnabledFailureStore(expected);
  const expectedRetention =
    'lifecycle' in expected && 'enabled' in expected.lifecycle
      ? expected.lifecycle.enabled.data_retention
      : undefined;

  for (const streamName of streamNames) {
    const failureStore = dataStreamFailureStores[streamName];
    expect(failureStore?.enabled).toBe(expectedEnabled);
    if (expectedEnabled && expectedRetention) {
      expect(failureStore?.lifecycle?.data_retention).toBe(expectedRetention);
    }
  }
};
