/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createToken } from '@kbn/core-di';

/**
 * Who is behind a change: a `user` request with credentials, or the `internal`
 * Kibana user acting on its own (e.g. a feature flag pausing background work).
 */
export type EventOrigin = 'user' | 'internal';

/** Origin of the changes made by the current scope. Defaults to `user`. */
export const EventOriginToken = createToken<EventOrigin>('alerting_v2.EventOrigin');
