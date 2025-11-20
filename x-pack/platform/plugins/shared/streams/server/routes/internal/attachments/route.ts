/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { createServerRoute } from '../../create_server_route';
import type { Attachment } from '../../../lib/streams/attachments/types';
import { ATTACHMENT_TYPES } from '../../../lib/streams/attachments/types';

const attachmentTypeSchema = z.enum(ATTACHMENT_TYPES);

export interface SuggestAttachmentsResponse {
  suggestions: Attachment[];
}

const suggestAttachmentsRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{streamName}/attachments/_suggestions',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      streamName: z.string(),
    }),
    query: z.object({
      query: z.string(),
      attachmentType: z.optional(attachmentTypeSchema),
    }),
    body: z.object({
      tags: z.optional(z.array(z.string())),
    }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<SuggestAttachmentsResponse> => {
    const { attachmentClient, streamsClient } = await getScopedClients({ request });

    await streamsClient.ensureStream(params.path.streamName);

    const {
      query,
      body: { tags },
    } = params;

    const suggestions = (
      await attachmentClient.getSuggestions({
        attachmentTypes: query.attachmentType ? [query.attachmentType] : undefined,
        query: query.query,
        tags,
      })
    ).attachments;

    return {
      suggestions,
    };
  },
});

export const internalAttachmentRoutes = {
  ...suggestAttachmentsRoute,
};
