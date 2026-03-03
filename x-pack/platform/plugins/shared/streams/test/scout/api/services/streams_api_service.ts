/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Condition, StreamlangDSL } from '@kbn/streamlang';
import type { RoutingStatus, Streams } from '@kbn/streams-schema';
import type { KbnClient, ScoutLogger } from '@kbn/scout/src/common';
import { measurePerformanceAsync } from '@kbn/scout/src/common';
import type { IngestStream, IngestUpsertRequest } from '@kbn/streams-schema/src/models/ingest';

export interface StreamsTestApiService {
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  isEnabled: () => Promise<boolean>;
  listStreams: () => Promise<{ streams: Streams.all.Definition[] }>;
  getStream: (streamName: string) => Promise<IngestStream.all.GetResponse>;
  createStream: (streamName: string, body: Streams.all.UpsertRequest) => Promise<void>;
  updateStream: (streamName: string, body: { ingest: IngestUpsertRequest }) => Promise<void>;
  deleteStream: (streamName: string) => Promise<void>;
  forkStream: (
    parentStream: string,
    childStream: string,
    condition: Condition,
    status?: RoutingStatus
  ) => Promise<void>;
  simulateProcessing: (
    streamName: string,
    processing: StreamlangDSL,
    documents: Array<Record<string, unknown>>
  ) => Promise<{ documents: Array<Record<string, unknown>> }>;
  getUnmappedFields: (streamName: string) => Promise<{ unmappedFields: string[] }>;
  simulateFieldMapping: (
    streamName: string,
    fieldDefinitions: Array<{ name: string; type: string }>
  ) => Promise<{
    status: 'unknown' | 'success' | 'failure';
    simulationError: string | null;
    documentsWithRuntimeFieldsApplied: Array<Record<string, unknown>> | null;
  }>;
  getLifecycleStats: (streamName: string) => Promise<{ phases: unknown }>;
  cleanupTestStreams: (prefix?: string) => Promise<void>;
}

export function getStreamsTestApiService({
  kbnClient,
  log,
}: {
  kbnClient: KbnClient;
  log: ScoutLogger;
}): StreamsTestApiService {
  return {
    async enable() {
      await measurePerformanceAsync(log, 'streamsTestApi.enable', async () => {
        await kbnClient.request({
          method: 'POST',
          path: '/api/streams/_enable',
        });
      });
    },

    async disable() {
      await measurePerformanceAsync(log, 'streamsTestApi.disable', async () => {
        await kbnClient.request({
          method: 'POST',
          path: '/api/streams/_disable',
        });
      });
    },

    async isEnabled() {
      return measurePerformanceAsync(log, 'streamsTestApi.isEnabled', async () => {
        const response = await kbnClient.request({
          method: 'GET',
          path: '/api/streams/_status',
        });
        return (response.data as { enabled: boolean }).enabled;
      });
    },

    async listStreams() {
      return measurePerformanceAsync(log, 'streamsTestApi.listStreams', async () => {
        const response = await kbnClient.request({
          method: 'GET',
          path: '/api/streams',
        });
        return response.data as { streams: Streams.all.Definition[] };
      });
    },

    async getStream(streamName: string) {
      return measurePerformanceAsync(log, 'streamsTestApi.getStream', async () => {
        const response = await kbnClient.request({
          method: 'GET',
          path: `/api/streams/${streamName}`,
        });
        return response.data as IngestStream.all.GetResponse;
      });
    },

    async createStream(streamName: string, body: Streams.all.UpsertRequest) {
      await measurePerformanceAsync(log, 'streamsTestApi.createStream', async () => {
        await kbnClient.request({
          method: 'PUT',
          path: `/api/streams/${streamName}`,
          body,
        });
      });
    },

    async updateStream(streamName: string, body: { ingest: IngestUpsertRequest }) {
      await measurePerformanceAsync(log, 'streamsTestApi.updateStream', async () => {
        await kbnClient.request({
          method: 'PUT',
          path: `/api/streams/${streamName}/_ingest`,
          body,
        });
      });
    },

    async deleteStream(streamName: string) {
      await measurePerformanceAsync(log, 'streamsTestApi.deleteStream', async () => {
        await kbnClient.request({
          method: 'DELETE',
          path: `/api/streams/${streamName}`,
        });
      });
    },

    async forkStream(
      parentStream: string,
      childStream: string,
      condition: Condition,
      status: RoutingStatus = 'enabled'
    ) {
      await measurePerformanceAsync(log, 'streamsTestApi.forkStream', async () => {
        await kbnClient.request({
          method: 'POST',
          path: `/api/streams/${parentStream}/_fork`,
          body: {
            where: condition,
            status,
            stream: {
              name: childStream,
            },
          },
        });
      });
    },

    async simulateProcessing(
      streamName: string,
      processing: StreamlangDSL,
      documents: Array<Record<string, unknown>>
    ) {
      return measurePerformanceAsync(log, 'streamsTestApi.simulateProcessing', async () => {
        const response = await kbnClient.request({
          method: 'POST',
          path: `/internal/streams/${streamName}/processing/_simulate`,
          body: {
            processing,
            documents,
          },
        });
        return response.data as { documents: Array<Record<string, unknown>> };
      });
    },

    async getUnmappedFields(streamName: string) {
      return measurePerformanceAsync(log, 'streamsTestApi.getUnmappedFields', async () => {
        const response = await kbnClient.request({
          method: 'GET',
          path: `/internal/streams/${streamName}/schema/unmapped_fields`,
        });
        return response.data as { unmappedFields: string[] };
      });
    },

    async simulateFieldMapping(
      streamName: string,
      fieldDefinitions: Array<{ name: string; type: string }>
    ) {
      return measurePerformanceAsync(log, 'streamsTestApi.simulateFieldMapping', async () => {
        const response = await kbnClient.request({
          method: 'POST',
          path: `/internal/streams/${streamName}/schema/fields_simulation`,
          body: {
            field_definitions: fieldDefinitions,
          },
        });
        return response.data as {
          status: 'unknown' | 'success' | 'failure';
          simulationError: string | null;
          documentsWithRuntimeFieldsApplied: Array<Record<string, unknown>> | null;
        };
      });
    },

    async getLifecycleStats(streamName: string) {
      return measurePerformanceAsync(log, 'streamsTestApi.getLifecycleStats', async () => {
        const response = await kbnClient.request({
          method: 'GET',
          path: `/internal/streams/${streamName}/lifecycle/_stats`,
        });
        return response.data as { phases: unknown };
      });
    },

    async cleanupTestStreams(prefix = 'logs.test') {
      await measurePerformanceAsync(log, 'streamsTestApi.cleanupTestStreams', async () => {
        const { streams } = await this.listStreams();
        const testStreams = streams.filter((stream) => stream.name.startsWith(prefix));

        // Delete in reverse order (children first)
        const sortedStreams = testStreams.sort(
          (a, b) => b.name.split('.').length - a.name.split('.').length
        );

        for (const stream of sortedStreams) {
          try {
            await this.deleteStream(stream.name);
          } catch (error) {
            log.debug(`Failed to delete stream ${stream.name}: ${error}`);
          }
        }
      });
    },
  };
}
