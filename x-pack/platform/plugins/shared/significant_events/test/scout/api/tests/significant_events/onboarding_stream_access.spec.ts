/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags, type KibanaRole } from '@kbn/scout';
import { v4 as uuidv4 } from 'uuid';
import { significantEventsApiTest as apiTest } from '../../fixtures';
import { COMMON_API_HEADERS, PUBLIC_API_HEADERS } from '../../fixtures/constants';

// Neither streams test role has Elasticsearch privileges outside `logs*`, so a
// `traces-*` name is a stream the caller cannot read regardless of existence.
const forbiddenStream = () => `traces-onboarding-access-${uuidv4().slice(0, 8)}`;
const READABLE_STREAM = 'logs';
// enableStreams() creates logs.otel. `logs` itself is not a Stream definition.
const H1_PARENT_STREAM = 'logs.otel';

// Matches HackerOne 3770125: Kibana `feature.streams: ['read']` and Elasticsearch
// read only on `logs.otel`, not on forked children of that stream.
const h1StreamsReadOnly: KibanaRole = {
  kibana: [
    {
      base: [],
      feature: { streams: ['read'] },
      spaces: ['*'],
    },
  ],
  elasticsearch: {
    cluster: ['monitor'],
    indices: [
      { names: [H1_PARENT_STREAM], privileges: ['read', 'view_index_metadata'] },
      { names: ['.kibana_streams*'], privileges: ['read', 'view_index_metadata'] },
      { names: ['.significant_events*'], privileges: ['read', 'view_index_metadata'] },
    ],
  },
};

apiTest.describe(
  'Onboarding routes enforce per-stream access',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let existingForbidden: string | undefined;

    apiTest.afterEach(async ({ apiServices }) => {
      if (!existingForbidden) {
        return;
      }

      const streamToDelete = existingForbidden;
      existingForbidden = undefined;
      await apiServices.streams.deleteStream(streamToDelete);
    });

    apiTest(
      'GET onboarding/_status returns 403 for a stream the caller cannot read',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsReadOnly();

        const response = await apiClient.get(
          `internal/streams/${forbiddenStream()}/onboarding/_status`,
          { headers: { ...COMMON_API_HEADERS, ...cookieHeader }, responseType: 'json' }
        );

        expect(response.statusCode).toBe(403);
      }
    );

    apiTest(
      'GET onboarding/_status returns 403 for an existing stream when the role matches the HackerOne report',
      async ({ apiClient, samlAuth, apiServices }) => {
        const streamName = `${H1_PARENT_STREAM}.h1-idor-${uuidv4().slice(0, 8)}`;

        await apiServices.streams.forkStream(H1_PARENT_STREAM, streamName, {
          field: 'service.name',
          eq: 'h1-idor',
        });
        existingForbidden = streamName;

        const { cookieHeader } = await samlAuth.asInteractiveUser(h1StreamsReadOnly);

        const readableStream = await apiClient.get(`api/streams/${H1_PARENT_STREAM}`, {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });
        expect(readableStream.statusCode).toBe(200);

        const forbiddenStreamRead = await apiClient.get(`api/streams/${streamName}`, {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });
        expect(forbiddenStreamRead.statusCode).toBe(403);

        const readableStatus = await apiClient.get(
          `internal/streams/${H1_PARENT_STREAM}/onboarding/_status`,
          { headers: { ...COMMON_API_HEADERS, ...cookieHeader }, responseType: 'json' }
        );
        expect(readableStatus.statusCode).toBe(200);
        expect(readableStatus.body.status).toBeDefined();

        const forbiddenStatus = await apiClient.get(
          `internal/streams/${streamName}/onboarding/_status`,
          { headers: { ...COMMON_API_HEADERS, ...cookieHeader }, responseType: 'json' }
        );
        expect(forbiddenStatus.statusCode).toBe(403);
        expect(JSON.stringify(forbiddenStatus.body)).not.toContain('log_samples');
      }
    );

    apiTest(
      'GET onboarding/_status returns the status for a readable stream',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsReadOnly();

        const response = await apiClient.get(
          `internal/streams/${READABLE_STREAM}/onboarding/_status`,
          { headers: { ...COMMON_API_HEADERS, ...cookieHeader }, responseType: 'json' }
        );

        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBeDefined();
      }
    );

    apiTest(
      'POST onboarding/_execute returns 403 for a stream the caller cannot access',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();

        const response = await apiClient.post(
          `internal/streams/${forbiddenStream()}/onboarding/_execute`,
          {
            headers: { ...COMMON_API_HEADERS, ...cookieHeader },
            body: { action: 'cancel' },
            responseType: 'json',
          }
        );

        expect(response.statusCode).toBe(403);
      }
    );

    apiTest(
      'POST onboarding/_bulk_status omits streams the caller cannot read',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsReadOnly();
        const forbidden = forbiddenStream();

        const response = await apiClient.post('internal/streams/onboarding/_bulk_status', {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          body: { streamNames: [READABLE_STREAM, forbidden] },
          responseType: 'json',
        });

        expect(response.statusCode).toBe(200);
        expect(response.body[READABLE_STREAM]).toBeDefined();
        expect(response.body[forbidden]).toBeUndefined();
      }
    );

    apiTest(
      'POST knowledge_indicators/_keep_alive returns 403 for a stream the caller cannot access',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();

        const response = await apiClient.post(
          `internal/streams/${forbiddenStream()}/knowledge_indicators/_keep_alive`,
          {
            headers: { ...COMMON_API_HEADERS, ...cookieHeader },
            body: { lastRefreshedBefore: new Date().toISOString() },
            responseType: 'json',
          }
        );

        expect(response.statusCode).toBe(403);
      }
    );
  }
);
