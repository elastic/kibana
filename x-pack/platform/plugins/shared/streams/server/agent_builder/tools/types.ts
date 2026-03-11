/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetScopedClients } from '../../routes/types';
import type { StreamsServer } from '../../types';

export interface SigEventsToolsDeps {
  getScopedClients: GetScopedClients;
  server: StreamsServer;
}
