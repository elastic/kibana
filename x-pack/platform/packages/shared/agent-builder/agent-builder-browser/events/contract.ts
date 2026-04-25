/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { BrowserChatEvent } from './events';

/**
 * Public-facing contract for AgentBuilder's events service.
 */
export interface EventsServiceStartContract {
  /**
   * (hot) observable of all chat events.
   */
  chat$: Observable<BrowserChatEvent>;
}
