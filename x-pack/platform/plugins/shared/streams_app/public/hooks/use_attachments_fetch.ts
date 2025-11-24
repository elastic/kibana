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
  name,
  attachmentType,
}: {
  name: string;
  attachmentType?: AttachmentType;
}) => {
  const {
    services: { telemetryClient },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const attachmentsFetch = useStreamsAppFetch(
    async ({ signal }) => {
      const response = await streamsRepositoryClient.fetch(
        'GET /api/streams/{streamName}/attachments 2023-10-31',
        {
          signal,
          params: {
            path: {
              streamName: name,
            },
            query: {
              attachmentType,
            },
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
        name,
        dashboards: attachmentCounts.dashboard || 0,
        rules: attachmentCounts.rule,
      });

      return response;
    },
    [name, attachmentType, streamsRepositoryClient, telemetryClient]
  );

  return attachmentsFetch;
};
