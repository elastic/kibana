/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import type { Attachment } from '@kbn/streams-plugin/server/lib/streams/attachments/types';
import { useAbortController } from '@kbn/react-hooks';
import { useKibana } from './use_kibana';
import { useStreamDetail } from './use_stream_detail';

export const useAttachmentsApi = ({ name }: { name: string }) => {
  const { refresh } = useStreamDetail();
  const { signal } = useAbortController();
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const addAttachments = useCallback(
    async (attachments: Attachment[]) => {
      await streamsRepositoryClient.fetch(
        'POST /api/streams/{streamName}/attachments/_bulk 2023-10-31',
        {
          signal,
          params: {
            path: {
              streamName: name,
            },
            body: {
              operations: attachments.map((attachment) => {
                return {
                  index: {
                    id: attachment.id,
                    type: attachment.type,
                  },
                };
              }),
            },
          },
        }
      );
      refresh();
    },
    [name, signal, streamsRepositoryClient, refresh]
  );

  const removeAttachments = useCallback(
    async (attachments: Attachment[]) => {
      await streamsRepositoryClient.fetch(
        'POST /api/streams/{streamName}/attachments/_bulk 2023-10-31',
        {
          signal,
          params: {
            path: {
              streamName: name,
            },
            body: {
              operations: attachments.map((attachment) => {
                return {
                  delete: {
                    id: attachment.id,
                    type: attachment.type,
                  },
                };
              }),
            },
          },
        }
      );
      refresh();
    },
    [name, signal, streamsRepositoryClient, refresh]
  );

  return {
    addAttachments,
    removeAttachments,
  };
};
