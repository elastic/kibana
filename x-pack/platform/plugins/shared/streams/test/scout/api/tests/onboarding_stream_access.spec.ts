/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags, type KibanaRole } from '@kbn/scout';
import { v4 as uuidv4 } from 'uuid';
import { streamsApiTest as apiTest } from '../fixtures';
import { COMMON_API_HEADERS, PUBLIC_API_HEADERS } from '../fixtures/constants';

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
    ],
  },
};

apiTest.describe(
  'Onboarding and query generation routes enforce per-stream access',
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
      'GET onboarding/_status and significant_events/_status return 403 for an existing stream the caller cannot read',
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

        const onboardingStatus = await apiClient.get(
          `internal/streams/${streamName}/onboarding/_status`,
          { headers: { ...COMMON_API_HEADERS, ...cookieHeader }, responseType: 'json' }
        );
        expect(onboardingStatus.statusCode).toBe(403);
        expect(JSON.stringify(onboardingStatus.body)).not.toContain('log_samples');

        const queryGenerationStatus = await apiClient.get(
          `internal/streams/${streamName}/significant_events/_status`,
          { headers: { ...COMMON_API_HEADERS, ...cookieHeader }, responseType: 'json' }
        );
        expect(queryGenerationStatus.statusCode).toBe(403);

        const readableOnboarding = await apiClient.get(
          `internal/streams/${H1_PARENT_STREAM}/onboarding/_status`,
          { headers: { ...COMMON_API_HEADERS, ...cookieHeader }, responseType: 'json' }
        );
        expect(readableOnboarding.statusCode).toBe(200);
      }
    );
  }
);
