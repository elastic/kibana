/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createToken } from '@kbn/core-di';
import type { EventOriginActor } from './origin_schemas';

/**
 * Who is behind a change in the current scope: a `user` request with
 * credentials, or the `internal` Kibana user acting on its own. Defaults to
 * `user`. Publishers combine this actor with the request into the context origin.
 */
export const EventOriginActorToken = createToken<EventOriginActor>('alerting_v2.EventOriginActor');
