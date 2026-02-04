/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AttachmentType } from '@kbn/streams-plugin/server/lib/streams/attachments/types';
import { useKibana } from './use_kibana';
import { useStreamsAppFetch } from './use_streams_app_fetch';

export const useAttachmentsFetch = ({
  streamName,
  filters,
}: {
  streamName: string;
  filters?: {
    query?: string;
    attachmentTypes?: AttachmentType[];
    tags?: string[];
  };
}) => {
  const {
    services: { telemetryClient },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const { query, attachmentTypes, tags } = filters ?? {};

  const attachmentsFetch = useStreamsAppFetch(
    async ({ signal }) => {
      // Build query params object, only including defined values
      const queryParams: {
        query?: string;
        attachmentTypes?: AttachmentType[];
        tags?: string[];
      } = {};

      if (query) queryParams.query = query;
      if (attachmentTypes && attachmentTypes.length > 0)
        queryParams.attachmentTypes = attachmentTypes;
      if (tags && tags.length > 0) queryParams.tags = tags;

      const response = await streamsRepositoryClient.fetch(
        'GET /api/streams/{streamName}/attachments 2023-10-31',
        {
          signal,
          params: {
            path: {
              streamName,
            },
            query: queryParams,
          },
        }
      );

      // Count attachments by type for telemetry
      const attachmentCounts = response.attachments.reduce<Partial<Record<AttachmentType, number>>>(
        (acc, attachment) => {
          acc[attachment.type] = (acc[attachment.type] || 0) + 1;
          return acc;
        },
        {}
      );

      telemetryClient.trackAttachmentCounts({
        name: streamName,
        dashboard: attachmentCounts.dashboard ?? 0,
        rule: attachmentCounts.rule ?? 0,
        slo: attachmentCounts.slo ?? 0,
      });

      return response;
    },
    [streamName, query, attachmentTypes, tags, streamsRepositoryClient, telemetryClient]
  );

  return attachmentsFetch;
};
