/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { EbtTelemetryClient } from '../../telemetry';
import type { GetScopedClients } from '../../../routes/types';

/**
 * Dependencies passed into each Significant Events agent tool so handlers can access
 * plugin-scoped clients (streams, attachments, features, etc.) via getScopedClients(request),
 * plus logger and telemetry for diagnostics and events.
 */
export interface SignificantEventsAgentToolDependencies {
  getScopedClients: GetScopedClients;
  logger: Logger;
  telemetry: EbtTelemetryClient;
}
