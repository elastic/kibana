/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { ErrorCause } from '@elastic/elasticsearch/lib/api/types';
import { internal } from '@hapi/boom';
import { STREAMS_API_PRIVILEGES } from '../../../common/constants';
import { createServerRoute } from '../create_server_route';
import type { Attachment } from '../../lib/streams/attachments/types';

export interface ListDashboardsResponse {
  dashboards: Attachment[];
}

export interface LinkDashboardResponse {
  acknowledged: boolean;
}

export interface UnlinkDashboardResponse {
  acknowledged: boolean;
}

export interface SuggestDashboardResponse {
  suggestions: Attachment[];
}

export type BulkUpdateAttachmentsResponse =
  | {
      acknowledged: boolean;
    }
  | { errors: ErrorCause[] };

const listDashboardsRoute = createServerRoute({
  endpoint: 'GET /api/streams/{name}/dashboards 2023-10-31',
  options: {
    access: 'public',
    summary: 'Get stream dashboards',
    description:
      'Fetches all dashboards linked to a stream that are visible to the current user in the current space.',
    availability: {
      stability: 'experimental',
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
  }),
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  async handler({ params, request, getScopedClients }): Promise<ListDashboardsResponse> {
    const { attachmentClient, streamsClient } = await getScopedClients({ request });
    await streamsClient.ensureStream(params.path.name);

    const {
      path: { name: streamName },
    } = params;

    function isDashboard(attachment: Attachment) {
      return attachment.type === 'dashboard';
    }

    return {
      dashboards: (await attachmentClient.getAttachments(streamName, 'dashboard')).filter(
        isDashboard
      ),
    };
  },
});

const linkDashboardRoute = createServerRoute({
  endpoint: 'PUT /api/streams/{name}/dashboards/{dashboardId} 2023-10-31',
  options: {
    access: 'public',
    summary: 'Link a dashboard to a stream',
    description:
      'Links a dashboard to a stream. Noop if the dashboard is already linked to the stream.',
    availability: {
      stability: 'experimental',
    },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
      dashboardId: z.string(),
    }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<LinkDashboardResponse> => {
    const { attachmentClient, streamsClient } = await getScopedClients({ request });
    const {
      path: { dashboardId, name: streamName },
    } = params;

    await streamsClient.ensureStream(streamName);

    await attachmentClient.linkAttachment(streamName, {
      type: 'dashboard',
      id: dashboardId,
    });

    return {
      acknowledged: true,
    };
  },
});

const unlinkDashboardRoute = createServerRoute({
  endpoint: 'DELETE /api/streams/{name}/dashboards/{dashboardId} 2023-10-31',
  options: {
    access: 'public',
    summary: 'Unlink a dashboard from a stream',
    description:
      'Unlinks a dashboard from a stream. Noop if the dashboard is not linked to the stream.',
    availability: {
      stability: 'experimental',
    },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
      dashboardId: z.string(),
    }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<UnlinkDashboardResponse> => {
    const { attachmentClient, streamsClient } = await getScopedClients({ request });

    await streamsClient.ensureStream(params.path.name);

    const {
      path: { dashboardId, name: streamName },
    } = params;

    await attachmentClient.unlinkAttachment(streamName, {
      type: 'dashboard',
      id: dashboardId,
    });

    return {
      acknowledged: true,
    };
  },
});

const suggestDashboardsRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/dashboards/_suggestions',
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
      name: z.string(),
    }),
    query: z.object({
      query: z.string(),
    }),
    body: z.object({
      tags: z.optional(z.array(z.string())),
    }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<SuggestDashboardResponse> => {
    const { attachmentClient, streamsClient } = await getScopedClients({ request });

    await streamsClient.ensureStream(params.path.name);

    const {
      query: { query },
      body: { tags },
    } = params;

    const suggestions = (
      await attachmentClient.getSuggestions({
        attachmentTypes: ['dashboard'],
        query,
        tags,
      })
    ).attachments;

    return {
      suggestions,
    };
  },
});

const dashboardSchema = z.object({
  id: z.string(),
});

const bulkDashboardsRoute = createServerRoute({
  endpoint: `POST /api/streams/{name}/dashboards/_bulk 2023-10-31`,
  options: {
    access: 'public',
    summary: 'Bulk update dashboards',
    description:
      'Bulk update dashboards linked to a stream. Can link new dashboards and delete existing ones.',
    availability: {
      stability: 'experimental',
    },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
    body: z.object({
      operations: z.array(
        z.union([
          z.object({
            index: dashboardSchema,
          }),
          z.object({
            delete: dashboardSchema,
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
    const { attachmentClient, streamsClient } = await getScopedClients({ request });

    const {
      path: { name: streamName },
      body: { operations },
    } = params;

    await streamsClient.ensureStream(streamName);

    const result = await attachmentClient.bulk(
      streamName,
      operations.map((operation) => {
        if ('index' in operation) {
          return {
            index: {
              attachment: {
                type: 'dashboard',
                id: operation.index.id,
              },
            },
          };
        }
        return {
          delete: {
            attachment: {
              type: 'dashboard',
              id: operation.delete.id,
            },
          },
        };
      })
    );

    if (result.errors) {
      logger.error(`Error indexing some items`);
      throw internal(`Could not index all items`, { errors: result.errors });
    }

    return { acknowledged: true };
  },
});

export const dashboardRoutes = {
  ...listDashboardsRoute,
  ...linkDashboardRoute,
  ...unlinkDashboardRoute,
  ...suggestDashboardsRoute,
  ...bulkDashboardsRoute,
};
