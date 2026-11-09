/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentValidationResult } from '@kbn/streams-schema';
import {
  STALE_COMPONENT_CATALOGUE_HEADER,
  streamsComponentValidationRequestSchema,
} from '@kbn/streams-schema';
import { lazySchema, z } from '@kbn/zod/v4';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { CATALOGUE_FRESH_FOR_MS } from '../../../lib/component_catalogue/component_catalogue_service';
import { createServerRoute } from '../../create_server_route';
import { getRequestAbortSignal } from '../../utils/get_request_abort_signal';
import { assertStreamsCanvasEnabled } from '../unit/assert_streams_canvas_enabled';

// Component config values are free-form, so the body size is what bounds them.
const COMPONENT_VALIDATE_MAX_BYTES = 1_048_576;
// The catalogue changes only when the distributor is redeployed, so the browser reuses it for a
// minute without asking, then serves it while it revalidates in the background (the data views
// fields route does the same). Opening the flyout is a cache hit, not two conditional requests.
const CATALOGUE_CACHE_CONTROL = `private, max-age=${
  CATALOGUE_FRESH_FOR_MS / 1000
}, stale-while-revalidate=86400`;
// A copy served because the distributor could not be reached is not kept: the next open retries.
const STALE_CATALOGUE_CACHE_CONTROL = 'private, no-cache';

// Kibana hands an `etag` header to Hapi, which quotes it, so it takes the bare entity tag.
const toEntityTag = (etag: string): string => etag.replace(/^W\//, '').replace(/^"(.*)"$/, '$1');

export const getComponentCatalogueRoute = createServerRoute({
  endpoint: 'GET /internal/streams/components',
  options: {
    access: 'internal',
    summary: 'Get the Streams component catalogue',
    description:
      'Returns the sources, processors and destinations a unit can use, with the definitions their forms render from, as served by the config distributor.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  handler: async ({ request, response, getScopedClients, componentCatalogue }) => {
    const { uiSettingsClient } = await getScopedClients({ request });

    await assertStreamsCanvasEnabled(uiSettingsClient);

    const { catalogue, etag, stale } = await componentCatalogue.get();

    // Kibana's default `no-store` would keep the browser from revalidating. With an ETag, Hapi
    // answers a matching If-None-Match with a 304 on its own. A stale copy carries none: a 304 on
    // its tag would leave the stale marker in the browser's stored copy once the distributor is back.
    return response.ok({
      body: catalogue,
      headers: {
        ...(etag && !stale ? { etag: toEntityTag(etag) } : {}),
        'cache-control': stale ? STALE_CATALOGUE_CACHE_CONTROL : CATALOGUE_CACHE_CONTROL,
        ...(stale ? { [STALE_COMPONENT_CATALOGUE_HEADER]: 'true' } : {}),
      },
    });
  },
});

export const validateComponentRoute = createServerRoute({
  endpoint: 'POST /internal/streams/components/_validate',
  options: {
    access: 'internal',
    summary: 'Validate a Streams component',
    description:
      'Checks one source, processor or destination against its catalogue definition without writing anything. References to other components are only checked when the unit is saved.',
    body: {
      maxBytes: COMPONENT_VALIDATE_MAX_BYTES,
    },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: lazySchema(() =>
    z.object({
      body: streamsComponentValidationRequestSchema,
    })
  ),
  handler: async ({
    params,
    request,
    getScopedClients,
    componentCatalogue,
  }): Promise<ComponentValidationResult> => {
    const { uiSettingsClient } = await getScopedClients({ request });

    await assertStreamsCanvasEnabled(uiSettingsClient);

    return await componentCatalogue.validate({
      ...params.body,
      signal: getRequestAbortSignal(request),
    });
  },
});

export const componentRoutes = {
  ...getComponentCatalogueRoute,
  ...validateComponentRoute,
};
