/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { STREAMS_API_PRIVILEGES } from '../../../common/constants';
import { createServerRoute } from '../create_server_route';
import type { Attachment } from '../../lib/streams/attachments/types';
import { ATTACHMENT_TYPES } from '../../lib/streams/attachments/types';
import { assertAttachmentsAccess } from '../utils/assert_attachments_access';

export interface ListAttachmentsResponse {
  attachments: Attachment[];
}

export interface LinkAttachmentResponse {
  acknowledged: boolean;
}

export interface UnlinkAttachmentResponse {
  acknowledged: boolean;
}

export interface BulkUpdateAttachmentsResponse {
  acknowledged: boolean;
}

const attachmentTypeSchema = z.enum(ATTACHMENT_TYPES);

const listAttachmentsRoute = createServerRoute({
  endpoint: 'GET /api/streams/{streamName}/attachments 2023-10-31',
  options: {
    access: 'public',
    summary: 'Get stream attachments',
    description:
      'Fetches all attachments linked to a stream that are visible to the current user in the current space. Optionally filter by attachment types, search query, and tags.',
    availability: {
      stability: 'experimental',
    },
    oasOperationObject: () => ({
      requestBody: {
        content: {
          'application/json': {
            examples: {
              listAttachmentsExample: {
                value: {},
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Successfully retrieved attachments',
          content: {
            'application/json': {
              examples: {
                listAttachmentsResponse: {
                  value: {
                    attachments: [
                      {
                        id: 'dashboard-123',
                        type: 'dashboard',
                        title: 'My Dashboard',
                        tags: ['monitoring', 'production'],
                        description: 'Dashboard for monitoring production services',
                        createdAt: '2023-02-23T16:15:47.275Z',
                        updatedAt: '2023-03-24T14:39:17.636Z',
                        streamNames: ['logs.awsfirehose', 'logs.nginx'],
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    }),
  },
  params: z.object({
    path: z.object({
      streamName: z.string().describe('The name of the stream'),
    }),
    query: z
      .object({
        query: z.optional(z.string()).describe('Search query to filter attachments by title'),
        attachmentTypes: z
          .optional(z.union([attachmentTypeSchema, z.array(attachmentTypeSchema)]))
          .describe('Filter by attachment types (single value or array)'),
        tags: z
          .optional(z.union([z.string(), z.array(z.string())]))
          .describe('Filter by tags (single value or array)'),
      })
      .optional(),
  }),
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  async handler({ params, request, getScopedClients }): Promise<ListAttachmentsResponse> {
    const { attachmentClient, streamsClient, uiSettingsClient } = await getScopedClients({
      request,
    });
    await assertAttachmentsAccess({ uiSettingsClient });
    await streamsClient.ensureStream(params.path.streamName);

    const {
      path: { streamName },
      query,
    } = params;

    // Normalize single values to arrays for consistent handling
    const attachmentTypes = query?.attachmentTypes
      ? Array.isArray(query.attachmentTypes)
        ? query.attachmentTypes
        : [query.attachmentTypes]
      : undefined;

    const tags = query?.tags ? (Array.isArray(query.tags) ? query.tags : [query.tags]) : undefined;

    return {
      attachments: await attachmentClient.getAttachments(streamName, {
        query: query?.query,
        attachmentTypes,
        tags,
      }),
    };
  },
});

const linkAttachmentRoute = createServerRoute({
  endpoint: 'PUT /api/streams/{streamName}/attachments/{attachmentType}/{attachmentId} 2023-10-31',
  options: {
    access: 'public',
    summary: 'Link an attachment to a stream',
    description:
      'Links an attachment to a stream. Noop if the attachment is already linked to the stream.',
    availability: {
      stability: 'experimental',
    },
    oasOperationObject: () => ({
      requestBody: {
        content: {
          'application/json': {
            examples: {
              linkAttachmentExample: {
                value: {},
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Successfully linked attachment',
          content: {
            'application/json': {
              examples: {
                linkAttachmentResponse: {
                  value: {
                    acknowledged: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      streamName: z.string().describe('The name of the stream'),
      attachmentType: attachmentTypeSchema.describe('The type of the attachment'),
      attachmentId: z.string().describe('The ID of the attachment'),
    }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<LinkAttachmentResponse> => {
    const { attachmentClient, streamsClient, uiSettingsClient } = await getScopedClients({
      request,
    });
    await assertAttachmentsAccess({ uiSettingsClient });

    const {
      path: { attachmentId, attachmentType, streamName },
    } = params;

    await streamsClient.ensureStream(streamName);

    await attachmentClient.linkAttachment(streamName, {
      id: attachmentId,
      type: attachmentType,
    });

    return {
      acknowledged: true,
    };
  },
});

const unlinkAttachmentRoute = createServerRoute({
  endpoint:
    'DELETE /api/streams/{streamName}/attachments/{attachmentType}/{attachmentId} 2023-10-31',
  options: {
    access: 'public',
    summary: 'Unlink an attachment from a stream',
    description:
      'Unlinks an attachment from a stream. Noop if the attachment is not linked to the stream.',
    availability: {
      stability: 'experimental',
    },
    oasOperationObject: () => ({
      requestBody: {
        content: {
          'application/json': {
            examples: {
              unlinkAttachmentExample: {
                value: {},
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Successfully unlinked attachment',
          content: {
            'application/json': {
              examples: {
                unlinkAttachmentResponse: {
                  value: {
                    acknowledged: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      streamName: z.string().describe('The name of the stream'),
      attachmentType: attachmentTypeSchema.describe('The type of the attachment'),
      attachmentId: z.string().describe('The ID of the attachment'),
    }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<UnlinkAttachmentResponse> => {
    const { attachmentClient, streamsClient, uiSettingsClient } = await getScopedClients({
      request,
    });
    await assertAttachmentsAccess({ uiSettingsClient });

    await streamsClient.ensureStream(params.path.streamName);

    const {
      path: { attachmentId, attachmentType, streamName },
    } = params;

    await attachmentClient.unlinkAttachment(streamName, {
      id: attachmentId,
      type: attachmentType,
    });

    return {
      acknowledged: true,
    };
  },
});

const attachmentSchema = z.object({
  id: z.string(),
  type: attachmentTypeSchema,
});

const bulkAttachmentsRoute = createServerRoute({
  endpoint: `POST /api/streams/{streamName}/attachments/_bulk 2023-10-31`,
  options: {
    access: 'public',
    summary: 'Bulk update attachments',
    description:
      'Bulk update attachments linked to a stream. Can link new attachments and delete existing ones. Supports mixed attachment types in a single request.',
    availability: {
      stability: 'experimental',
    },
    oasOperationObject: () => ({
      requestBody: {
        content: {
          'application/json': {
            examples: {
              bulkAttachmentsExample: {
                value: {
                  operations: [
                    {
                      index: {
                        id: 'dashboard-123',
                        type: 'dashboard',
                      },
                    },
                    {
                      delete: {
                        id: 'rule-456',
                        type: 'rule',
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Successfully performed bulk operations',
          content: {
            'application/json': {
              examples: {
                bulkAttachmentsResponse: {
                  value: {
                    acknowledged: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      streamName: z.string().describe('The name of the stream'),
    }),
    body: z.object({
      operations: z.array(
        z.union([
          z.object({
            index: attachmentSchema,
          }),
          z.object({
            delete: attachmentSchema,
          }),
        ])
      ),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    logger,
  }): Promise<BulkUpdateAttachmentsResponse> => {
    const { attachmentClient, streamsClient, uiSettingsClient } = await getScopedClients({
      request,
    });
    await assertAttachmentsAccess({ uiSettingsClient });

    const {
      path: { streamName },
      body: { operations },
    } = params;

    await streamsClient.ensureStream(streamName);

    await attachmentClient.bulk(
      streamName,
      operations.map((operation) => {
        if ('index' in operation) {
          return {
            index: {
              attachment: {
                type: operation.index.type,
                id: operation.index.id,
              },
            },
          };
        }
        return {
          delete: {
            attachment: {
              type: operation.delete.type,
              id: operation.delete.id,
            },
          },
        };
      })
    );

    return { acknowledged: true };
  },
});

export const attachmentRoutes = {
  ...listAttachmentsRoute,
  ...linkAttachmentRoute,
  ...unlinkAttachmentRoute,
  ...bulkAttachmentsRoute,
};
