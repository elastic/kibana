/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  significantEventSchema,
  significantEventInvestigationSchema,
  significantEventStatusSchema,
  type Detection,
  type SignificantEvent,
  type Discovery,
  type LifecycleDetection,
  type EventLifecycleResponse,
} from '@kbn/significant-events-schema';
import { notFound, serverUnavailable } from '@hapi/boom';
import { z } from '@kbn/zod/v4';
import { attachInvestigationToEvent } from '../../../lib/significant_events/events/attach_investigation';
import { updateSignificantEventStatus } from '../../../lib/significant_events/events/update_event_status';
import { triggerInvestigationWorkflow } from '../../../lib/significant_events/events/trigger_investigation_workflow';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import type { PaginatedResponse } from '../../../lib/significant_events/query_utils';
import { createServerRoute } from '../../create_server_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';

const toArray = (val: string | string[] | undefined): string[] | undefined =>
  val === undefined ? undefined : Array.isArray(val) ? val : [val];

// Detections carry `change_point_type`; processed-marker docs do not.
const isLifecycleDetection = (hit: Detection): boolean => hit.change_point_type != null;

const collectEmbeddedDetections = (discoveries: Discovery[]) => {
  const seen = new Set<string>();
  const result: Array<Omit<LifecycleDetection, '@timestamp'>> = [];

  for (const discovery of discoveries) {
    for (const det of discovery.detections ?? []) {
      const { detection_id, rule_name, stream_name, change_point_type } = det;
      if (!detection_id || seen.has(detection_id)) continue;
      seen.add(detection_id);
      // The embedded discovery detection types `change_point_type` as a free-form string
      // (agent output); narrow to the schema enum for the lifecycle response.
      result.push({
        detection_id,
        rule_name,
        stream_name,
        change_point_type: change_point_type as LifecycleDetection['change_point_type'],
      });
    }
  }

  return result;
};

const eventsSearchRoute = createServerRoute({
  endpoint: 'GET /internal/significant_events/events',
  options: {
    access: 'internal',
    summary: 'Get latest events',
    description: 'Search event entities using their latest derived state with pagination.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    query: z.object({
      from: z.iso.datetime().optional(),
      to: z.iso.datetime().optional(),
      page: z.coerce.number().int().min(1).optional(),
      perPage: z.coerce.number().int().min(1).max(1000).optional(),
      status: z.union([z.string().max(50), z.array(z.string().max(50)).max(50)]).optional(),
      stream: z.union([z.string().max(255), z.array(z.string().max(255)).max(50)]).optional(),
      search: z.string().max(500).optional(),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<PaginatedResponse<SignificantEvent>> => {
    const { getEventClient, licensing, uiSettingsClient } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { status, stream, search, ...rest } = params.query;

    return getEventClient().findLatestPaginated({
      ...rest,
      status: toArray(status),
      stream: toArray(stream),
      search: search || undefined,
    });
  },
});

const eventsHistoryRoute = createServerRoute({
  endpoint: 'GET /internal/significant_events/events/{id}/history',
  options: {
    access: 'internal',
    summary: 'Get event history',
    description: 'Get all historical versions of a significant event entity.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({
      id: z.string().max(255),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<{ hits: SignificantEvent[] }> => {
    const { getEventClient, licensing, uiSettingsClient } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    return getEventClient().findById(params.path.id);
  },
});

const eventsBulkCreateRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/events',
  options: {
    access: 'internal',
    summary: 'Bulk create events',
    description: 'Create event entities in bulk.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.array(significantEventSchema),
  }),
  handler: async ({ params, request, getScopedClients, server }) => {
    const { getEventClient, licensing, uiSettingsClient } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    return getEventClient().bulkCreate(params.body);
  },
});

const eventsLifecycleRoute = createServerRoute({
  endpoint: 'GET /internal/significant_events/events/{id}/lifecycle',
  options: {
    access: 'internal',
    summary: 'Get event lifecycle',
    description:
      'Get the full lifecycle chain for a significant event: detections, discoveries, and event versions.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({
      id: z.string().max(255),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<EventLifecycleResponse> => {
    const { getEventClient, getDiscoveryClient, getDetectionClient, licensing, uiSettingsClient } =
      await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { hits: initialHits } = await getEventClient().findById(params.path.id);
    if (initialHits.length === 0) {
      return { detections: [], discoveries: [], events: [] };
    }

    const { discovery_slug: slug } = initialHits[0];

    const [{ hits: events }, { hits: discoveries }] = await Promise.all([
      getEventClient().findByDiscoverySlug(slug),
      getDiscoveryClient().findBySlug(slug),
    ]);

    const embedded = collectEmbeddedDetections(discoveries);
    const { hits: allDetectionHits } = await getDetectionClient().findByIds(
      embedded.map((e) => e.detection_id).filter(Boolean)
    );
    const hitsByDetectionId = new Map(
      allDetectionHits.filter(isLifecycleDetection).map((h) => [h.detection_id, h])
    );

    const detections: LifecycleDetection[] = embedded.flatMap(
      ({ detection_id, rule_name, stream_name, change_point_type }) => {
        const hit = hitsByDetectionId.get(detection_id);
        if (!hit) {
          return [];
        }

        return [
          {
            detection_id,
            rule_name: hit.rule_name ?? rule_name,
            stream_name: hit.stream_name ?? stream_name,
            change_point_type: change_point_type ?? hit.change_point_type,
            '@timestamp': hit['@timestamp'],
          },
        ];
      }
    );

    return { detections, discoveries, events };
  },
});

/**
 * Used by the managed investigation workflow (`investigation_workflow.yaml`). Keep the endpoint
 * path and body shape (`significantEventInvestigationSchema`) in sync with its
 * `attach_pending_to_significant_event` / `attach_to_significant_event` `kibana.request` steps.
 */
const eventsAttachInvestigationRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/events/{id}/investigations',
  options: {
    access: 'internal',
    summary: 'Attach investigation to event',
    description:
      'Record an investigation run against a significant event (pending, success, or failed).',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      id: z.string().max(255),
    }),
    body: significantEventInvestigationSchema,
  }),
  handler: async ({ params, request, getScopedClients, server }) => {
    const { getEventClient, licensing, uiSettingsClient } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    return attachInvestigationToEvent({
      eventClient: getEventClient(),
      eventId: params.path.id,
      investigation: params.body,
    });
  },
});

const eventsTriggerInvestigationRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/events/{id}/investigate',
  options: {
    access: 'internal',
    summary: 'Trigger investigation workflow for a significant event',
    description:
      'Starts the managed investigation workflow for the given significant event and returns the workflow execution id.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      id: z.string().max(255),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<{ executionId: string }> => {
    const { getEventClient, licensing, uiSettingsClient } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { hits } = await getEventClient().findById(params.path.id);
    if (hits.length === 0) {
      throw notFound(`Significant event "${params.path.id}" not found.`);
    }

    const executionId = await triggerInvestigationWorkflow({
      workflowsManagement: server.workflowsManagement,
      agentBuilder: server.agentBuilder,
      spaces: server.spaces,
      request,
      logger,
      event: hits[0],
    });

    if (!executionId) {
      throw serverUnavailable(
        'Investigation workflow is not available. Ensure workflows management is enabled and Kibana has finished installing managed workflows.'
      );
    }

    return { executionId };
  },
});

const eventsUpdateRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/events/{id}/update',
  options: {
    access: 'internal',
    summary: 'Update a significant event',
    description:
      'Manually override attributes of a significant event, writing a new append-only version.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      id: z.string().max(255),
    }),
    body: z.object({
      status: significantEventStatusSchema,
    }),
  }),
  handler: async ({ params, request, getScopedClients, server }) => {
    const { getEventClient, licensing, uiSettingsClient } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    return updateSignificantEventStatus({
      eventClient: getEventClient(),
      eventId: params.path.id,
      status: params.body.status,
    });
  },
});

export const internalEventsRoutes = {
  ...eventsSearchRoute,
  ...eventsHistoryRoute,
  ...eventsLifecycleRoute,
  ...eventsBulkCreateRoute,
  ...eventsAttachInvestigationRoute,
  ...eventsTriggerInvestigationRoute,
  ...eventsUpdateRoute,
};
