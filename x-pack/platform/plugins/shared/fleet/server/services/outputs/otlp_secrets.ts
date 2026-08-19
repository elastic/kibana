/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewOtlpOutput } from '../../../common/types';

/**
 * The minimal shape of an in-progress OTLP SO write that this helper mutates.
 * Compatible with both `OutputSoOtlpAttributes` (create path) and
 * `Nullable<Partial<OutputSoOtlpAttributes>>` (update path).
 */
export interface OtlpExporterSecretTarget {
  otlp_exporter?: {
    tls?: {
      key_pem?: string | null;
      tpm?: {
        owner_auth?: string | null;
        auth?: string | null;
      } | null;
    } | null;
  } | null;
  otlp_exporter_secrets?: string | null;
}

type OtlpTlsSecretsFallback = NonNullable<
  NonNullable<NewOtlpOutput['secrets']>['otlp_exporter']
>['tls'];

/**
 * Lifts sensitive TLS leaves (key_pem, tpm.owner_auth, tpm.auth) out of
 * otlp_exporter.tls and into the always-encrypted otlp_exporter_secrets attribute.
 *
 * When secret storage is disabled, also folds in Fleet-secret fallback values so the
 * behaviour mirrors the beats ssl pattern: inline value wins, fallback fills the gap.
 *
 * Must be called on the SO-bound data object — NOT the raw request payload.
 */
export const extractAndEncryptOtlpTlsSecrets = (
  target: OtlpExporterSecretTarget,
  tlsSecretsFallback?: OtlpTlsSecretsFallback
): void => {
  if (!target.otlp_exporter) return;

  const { tls } = target.otlp_exporter;

  // Inline values take priority; fallback fills the gap when storage is off.
  const keyPem = tls?.key_pem ?? (tlsSecretsFallback?.key_pem as string | undefined);
  const ownerAuth =
    tls?.tpm?.owner_auth ?? (tlsSecretsFallback?.tpm?.owner_auth as string | undefined);
  const auth = tls?.tpm?.auth ?? (tlsSecretsFallback?.tpm?.auth as string | undefined);

  if (!keyPem && !ownerAuth && !auth) return;

  // Write the sensitive values into the always-encrypted attribute.
  target.otlp_exporter_secrets = JSON.stringify({
    ...(keyPem ? { key_pem: keyPem } : {}),
    ...((ownerAuth || auth) && {
      tpm: {
        ...(ownerAuth ? { owner_auth: ownerAuth } : {}),
        ...(auth ? { auth } : {}),
      },
    }),
  });

  // Strip the sensitive leaves from the plaintext attribute so they are not stored twice.
  if (tls) {
    const { key_pem: _k, tpm, ...restTls } = tls;
    let strippedTpm: typeof tpm | undefined;
    if (tpm) {
      const { owner_auth: _o, auth: _a, ...restTpm } = tpm;
      strippedTpm = Object.keys(restTpm).length ? restTpm : undefined;
    }
    target.otlp_exporter = {
      ...target.otlp_exporter,
      tls: {
        ...restTls,
        ...(strippedTpm ? { tpm: strippedTpm } : {}),
      },
    };
  }
};
