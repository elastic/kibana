/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';

/**
 * App-scoped services threaded through the Kibana context.
 */
export interface SignificantEventsAppServices {
  /**
   * The plugin-wide availability gate (rollout flag × license × pricing tier),
   * created once in the plugin's start() and multicast. Components read it through
   * `useSignificantEventsPrivileges` instead of recreating the observable, because
   * every feature-flag evaluation POSTs a usage counter.
   */
  availability$: Observable<boolean>;
}
