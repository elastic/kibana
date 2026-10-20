/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { ActionSourceTypes, toActionSource } from '../../common/types/domain';
import type { ActionSource } from '../../common/types/domain';

/**
 * `isInternalApiRequest` is set by core on every request that carries Kibana's own
 * `x-elastic-internal-origin` header, which `core.http.fetch` attaches automatically
 * to all browser-originated calls. It's a heuristic, not a security boundary — like
 * any header, a script can set it too — but it's the same signal Kibana already uses
 * elsewhere (see `register_routes.ts`) to distinguish UI traffic from raw API calls.
 */
export const getDefaultActionSource = (request: KibanaRequest): ActionSource =>
  request.isInternalApiRequest
    ? toActionSource({ type: ActionSourceTypes.user, id: ActionSourceTypes.user })
    : toActionSource({ type: ActionSourceTypes.api, id: ActionSourceTypes.api });
