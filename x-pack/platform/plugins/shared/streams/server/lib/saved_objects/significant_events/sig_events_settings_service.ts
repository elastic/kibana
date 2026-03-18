/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { SigEventsSettingsClient } from './sig_events_settings_client';
import { SigEventsSettingsClientImpl } from './sig_events_settings_client';

export type { SigEventsSettings, SigEventsSettingsClient } from './sig_events_settings_client';

export class SigEventsSettingsService {
  constructor(private readonly logger: Logger) {}

  getClient({ soClient }: { soClient: SavedObjectsClientContract }): SigEventsSettingsClient {
    const clientLogger = this.logger.get('sig-events-settings-client');
    return new SigEventsSettingsClientImpl(soClient, clientLogger);
  }
}
