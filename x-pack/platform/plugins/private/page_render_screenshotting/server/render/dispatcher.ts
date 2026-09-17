/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { Agent } from 'undici';
import type { PluginConfig } from '../config';

/**
 * Presents this Kibana's client certificate to page-render-service, which reads our
 * identity off it. UIAM only honours the token alongside the identity it was minted for,
 * so without this the render is rejected.
 *
 * Mirrors the security plugin's own UIAM dispatcher. Undefined when no custom TLS is
 * configured, which is plain `fetch` behaviour.
 */
export function createDispatcher(ssl: PluginConfig['ssl']): Agent | undefined {
  const { certificate, key, certificateAuthorities, verificationMode } = ssl;

  const read = (file: string) => readFileSync(file, 'utf8');
  const cert = certificate ? read(certificate) : undefined;
  const clientKey = key ? read(key) : undefined;
  const ca = certificateAuthorities
    ? (Array.isArray(certificateAuthorities)
        ? certificateAuthorities
        : [certificateAuthorities]
      ).map(read)
    : undefined;

  if (!ca && !cert && !clientKey && verificationMode === 'full') {
    return undefined;
  }

  return new Agent({
    connect: {
      ca,
      cert,
      key: clientKey,
      // Kibana pods carry only the cluster-scoped intermediate CA, not a root.
      allowPartialTrustChain: true,
      rejectUnauthorized: verificationMode !== 'none',
      ...(verificationMode === 'certificate' ? { checkServerIdentity: () => undefined } : {}),
    },
  });
}
