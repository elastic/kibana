/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createRequestEncryptor } from '@elastic/request-crypto';
import { telemetryJWKS } from './telemetry_jwks';

export function getKID(isProd = false): string {
  return isProd ? 'kibana' : 'kibana_dev';
}

export async function encryptTelemetry(payload: any, isProd = false): Promise<string[]> {
  const kid = getKID(isProd);
  const encryptor = await createRequestEncryptor(telemetryJWKS);
  const clusters = [].concat(payload);
  return Promise.all(clusters.map((cluster: any) => encryptor.encrypt(kid, cluster)));
}
