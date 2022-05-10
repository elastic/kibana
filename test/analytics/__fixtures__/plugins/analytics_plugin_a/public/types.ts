/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { TelemetryCounter } from '@kbn/core/public';
import type { Action } from './custom_shipper';

declare global {
  interface Window {
    __analyticsPluginA__: {
      getLastActions: (takeNumberOfActions: number) => Promise<Action[]>;
      stats: TelemetryCounter[];
      setOptIn: (optIn: boolean) => void;
    };
  }
}
