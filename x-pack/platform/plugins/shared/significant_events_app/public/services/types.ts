/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FocusedSignificantEventService } from './focused_significant_event_service';

/**
 * App-scoped services threaded through the Kibana context.
 */
export interface SignificantEventsAppServices {
  focusedSignificantEventService: FocusedSignificantEventService;
}
