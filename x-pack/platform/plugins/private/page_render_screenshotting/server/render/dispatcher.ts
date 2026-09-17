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
 * Presents this Kibana's client certificate to page-render-service.
 *
 * The service reads our identity off that certificate and forwards it to UIAM together
 * with the token we send, and UIAM only honours the token alongside the identity it was
 * minted for — so without this the render request is rejected.
 *
 * Returns undefined when no custom TLS material is configured and full verification is
 * wanted, which is plain `fetch` behaviour and needs no dispatcher. Mirrors the security
 * plugin's own UIAM dispatcher so the two stay recognisably the same shape.
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
      // The trust bundle deployed in Kibana pods carries only the intermediate CA scoped
      // to the application cluster, not a root, so the chain is legitimately partial.
      allowPartialTrustChain: true,
      rejectUnauthorized: verificationMode !== 'none',
      ...(verificationMode === 'certificate' ? { checkServerIdentity: () => undefined } : {}),
    },
  });
}
