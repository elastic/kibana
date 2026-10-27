/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { X509Certificate } from 'crypto';
import type { Logger } from '@kbn/logging';
import { StatusError } from '../streams/errors/status_error';

// Mirrors streams-config-distributor targetIDFromCertificate, which picks the target Kibana writes to.
const SERVERLESS_TARGET_DNS_NAME =
  /^eident\.([a-z0-9-]+)\.project\.[^.]+\.type\.[^.]+\.organization$/;
const ECH_TARGET_DNS_NAME = /^([a-z0-9-]+)\.deployment\.[^.]+\.account$/;
const TARGET_ID_PATTERN = /^[a-z0-9-]+$/;
const TARGET_ID_MAX_BYTES = 32;

/** Returns the `target_id` sealed credentials are bound to, or throws a 503 `StatusError`. */
export type ResolveTargetId = () => string;

const isValidTargetId = (targetId: string): boolean =>
  TARGET_ID_PATTERN.test(targetId) && Buffer.byteLength(targetId) <= TARGET_ID_MAX_BYTES;

/** Picks the single target the distributor would derive from these DNS SANs. */
export const targetIdFromDnsNames = (dnsNames: readonly string[]): string => {
  let target: string | undefined;

  for (const dnsName of dnsNames.map((name) => name.toLowerCase())) {
    const match = SERVERLESS_TARGET_DNS_NAME.exec(dnsName) ?? ECH_TARGET_DNS_NAME.exec(dnsName);
    if (!match) {
      continue;
    }

    const [, candidate] = match;
    if (!isValidTargetId(candidate)) {
      throw new Error(`target id is longer than ${TARGET_ID_MAX_BYTES} bytes`);
    }
    if (target !== undefined && candidate !== target) {
      throw new Error('client certificate identifies multiple targets');
    }
    target = candidate;
  }

  if (target === undefined) {
    throw new Error('client certificate has no supported target DNS name');
  }

  return target;
};

// X509Certificate parses the first PEM block, which is the leaf in a chain.
const dnsNamesFromCertificate = (certificate: string): string[] =>
  (new X509Certificate(certificate).subjectAltName ?? '')
    .split(', ')
    .flatMap((entry) => (entry.startsWith('DNS:') ? [entry.slice('DNS:'.length)] : []));

const resolveOnce = ({
  certificate,
  fallbackTargetId,
  logger,
}: {
  certificate?: string;
  fallbackTargetId?: string;
  logger: Logger;
}): { targetId: string } | { reason: string } => {
  if (certificate) {
    try {
      return { targetId: targetIdFromDnsNames(dnsNamesFromCertificate(certificate)) };
    } catch (error) {
      return { reason: error instanceof Error ? error.message : String(error) };
    }
  }

  if (fallbackTargetId === undefined) {
    return { reason: 'no distributor client certificate is configured' };
  }

  if (!isValidTargetId(fallbackTargetId)) {
    return {
      reason: `xpack.cloud.serverless.project_id [${fallbackTargetId}] is not a valid target id`,
    };
  }

  logger.info(
    `No distributor client certificate is configured. Sealing credentials for project [${fallbackTargetId}].`
  );
  return { targetId: fallbackTargetId };
};

/** Resolves the `target_id` the distributor derives from the same client certificate, once. */
export const createTargetIdResolver = (options: {
  certificate?: string;
  fallbackTargetId?: string;
  logger: Logger;
}): ResolveTargetId => {
  const resolved = resolveOnce(options);

  return () => {
    if ('targetId' in resolved) {
      return resolved.targetId;
    }
    throw new StatusError(`Cannot seal Streams unit credentials: ${resolved.reason}`, 503);
  };
};
