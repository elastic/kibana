/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';

const discoveryKindSchema = z.enum(['events', 'detections', 'discoveries', 'verdicts']);

type DiscoveryKind = z.infer<typeof discoveryKindSchema>;

const KIND_TO_INDEX: Record<DiscoveryKind, string> = {
  events: 'sigevents-events-ms',
  detections: 'sigevents-detections-ms',
  discoveries: 'sigevents-discoveries-ms',
  verdicts: 'sigevents-verdicts-ms',
};

export interface DiscoveryRecord {
  _id: string;
  _index: string;
  _source: unknown;
}

export interface DiscoveryRecordsResponse {
  kind: DiscoveryKind;
  total: number;
  records: DiscoveryRecord[];
}

const readDiscoveryRecordsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_discovery_records',
  params: z.object({
    query: z.object({
      kind: discoveryKindSchema.describe(
        'Which multi-step pipeline output to read: events, detections, discoveries, or verdicts'
      ),
      size: z.coerce
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .describe('Maximum number of records to return (default 100, max 500)'),
    }),
  }),
  options: {
    access: 'internal',
    summary: 'Read records from the multi-step significant events pipeline',
    description:
      'Returns the most recent documents from one of the four sigevents-*-ms indices produced by the multi-step significant events pipeline.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<DiscoveryRecordsResponse> => {
    const { scopedClusterClient, licensing, uiSettingsClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { kind, size = 100 } = params.query;
    const index = KIND_TO_INDEX[kind];

    const response = await scopedClusterClient.asCurrentUser.search<unknown>({
      index,
      size,
      sort: [{ '@timestamp': { order: 'desc' } }],
      ignore_unavailable: true,
      allow_no_indices: true,
      track_total_hits: true,
    });

    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? 0;

    const records: DiscoveryRecord[] = response.hits.hits.map((hit) => ({
      _id: hit._id ?? '',
      _index: hit._index,
      _source: hit._source,
    }));

    return { kind, total, records };
  },
});

export interface DiscoveryRecordsBulkDeleteResponse {
  kind: DiscoveryKind;
  succeeded: number;
  failed: number;
}

const bulkDeleteDiscoveryRecordsRoute = createServerRoute({
  endpoint: 'POST /internal/streams/_discovery_records/_bulk_delete',
  params: z.object({
    body: z.object({
      kind: discoveryKindSchema.describe(
        'Which multi-step pipeline output to delete from: events, detections, discoveries, or verdicts'
      ),
      ids: z.array(z.string().min(1)).min(1).max(1000).describe('Document _id values to delete'),
    }),
  }),
  options: {
    access: 'internal',
    summary: 'Bulk delete records from a multi-step significant events index',
    description:
      'Removes the specified documents from one of the four sigevents-*-ms indices. Missing documents count as failures.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<DiscoveryRecordsBulkDeleteResponse> => {
    const { scopedClusterClient, licensing, uiSettingsClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { kind, ids } = params.body;
    const index = KIND_TO_INDEX[kind];

    const operations = ids.flatMap((id) => [{ delete: { _index: index, _id: id } }]);

    const response = await scopedClusterClient.asCurrentUser.bulk({
      operations,
      refresh: 'wait_for',
    });

    let succeeded = 0;
    let failed = 0;
    for (const item of response.items) {
      const result = item.delete;
      if (!result) {
        failed += 1;
        continue;
      }
      if (result.error || (result.status && result.status >= 400 && result.result !== 'deleted')) {
        failed += 1;
      } else if (result.result === 'deleted') {
        succeeded += 1;
      } else {
        failed += 1;
      }
    }

    return { kind, succeeded, failed };
  },
});

export const internalDiscoveryRecordsRoutes = {
  ...readDiscoveryRecordsRoute,
  ...bulkDeleteDiscoveryRecordsRoute,
};
