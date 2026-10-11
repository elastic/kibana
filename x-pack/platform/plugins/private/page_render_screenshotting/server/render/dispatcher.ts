/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { Agent } from 'undici';
import type { PluginConfig } from '../config';

/** Same TLS setup as the security plugin's UIAM client. Undefined when no custom TLS is configured. */
function createDispatcher(ssl: PluginConfig['ssl']): Agent | undefined {
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
      // The configured CA may be an intermediate rather than a root.
      allowPartialTrustChain: true,
      rejectUnauthorized: verificationMode !== 'none',
      ...(verificationMode === 'certificate' ? { checkServerIdentity: () => undefined } : {}),
    },
  });
}

/**
 * Reads the certificate files on first use rather than at startup, so environments that load
 * the serverless config without those files (e.g. functional tests) can still start.
 */
export function createDispatcherProvider(ssl: PluginConfig['ssl']): () => Agent | undefined {
  let agent: Agent | undefined;
  let created = false;

  return () => {
    if (!created) {
      agent = createDispatcher(ssl);
      created = true;
    }
    return agent;
  };
}
