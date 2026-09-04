/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import { INTERNAL_BASE_ACTION_API_PATH } from '../../constants';

export interface RotateInboundIngressResult {
  ingestToken: string;
}

export async function rotateInboundIngress({
  http,
  id,
}: {
  http: HttpSetup;
  id: string;
}): Promise<RotateInboundIngressResult> {
  const res = await http.post<{ ingest_token?: string }>(
    `${INTERNAL_BASE_ACTION_API_PATH}/connector/${encodeURIComponent(id)}/_rotate_event_token`
  );
  if (typeof res.ingest_token !== 'string' || res.ingest_token.length === 0) {
    throw new Error('Rotate did not return an ingest token.');
  }
  return { ingestToken: res.ingest_token };
}
