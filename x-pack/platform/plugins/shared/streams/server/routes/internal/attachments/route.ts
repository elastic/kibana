/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ATTACHMENT_SUGGESTIONS_LIMIT, STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { createServerRoute } from '../../create_server_route';
import type { Attachment } from '../../../lib/streams/attachments/types';
import { ATTACHMENT_TYPES } from '../../../lib/streams/attachments/types';
import { assertAttachmentsAccess } from '../../utils/assert_attachments_access';

const attachmentTypeSchema = z.enum(ATTACHMENT_TYPES);

export interface SuggestAttachmentsResponse {
  suggestions: Attachment[];
}

const suggestAttachmentsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{streamName}/attachments/_suggestions',
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
    query: z
      .object({
        query: z.optional(z.string()),
        attachmentTypes: z.optional(z.union([attachmentTypeSchema, z.array(attachmentTypeSchema)])),
        tags: z.optional(z.union([z.string(), z.array(z.string())])),
      })
      .optional(),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<SuggestAttachmentsResponse> => {
    const { attachmentClient, streamsClient, uiSettingsClient } = await getScopedClients({
      request,
    });
    await assertAttachmentsAccess({ uiSettingsClient });

    await streamsClient.ensureStream(params.path.streamName);

    const { query } = params;

    // Normalize single values to arrays for consistent handling
    const attachmentTypes = query?.attachmentTypes
      ? Array.isArray(query.attachmentTypes)
        ? query.attachmentTypes
        : [query.attachmentTypes]
      : undefined;

    const tags = query?.tags ? (Array.isArray(query.tags) ? query.tags : [query.tags]) : undefined;

    const { suggestions } = await attachmentClient.getSuggestions({
      streamName: params.path.streamName,
      attachmentTypes,
      query: query?.query || '',
      tags,
      limit: ATTACHMENT_SUGGESTIONS_LIMIT,
    });

    return {
      suggestions,
    };
  },
});

export const internalAttachmentRoutes = {
  ...suggestAttachmentsRoute,
};
