/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClientContext } from '../../../../../actions_client';

export interface RotateInboundIngressParams {
  context: ActionsClientContext;
  id: string;
}

/** One-time ingest token returned on rotate; never persisted. */
export interface RotateInboundIngressResult {
  ingestToken: string;
}
