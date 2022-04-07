/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Event, EventType } from 'src/core/public';

declare global {
  interface Window {
    __analytics_ftr_helpers__: {
      setOptIn: (optIn: boolean) => void;
      getLastEvents: (takeNumberOfEvents: number, eventTypes?: EventType[]) => Promise<Event[]>;
    };
  }
}
