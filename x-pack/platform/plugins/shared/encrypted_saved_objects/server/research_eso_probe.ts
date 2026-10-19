/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { SavedObjectTypeRegistry } from '@kbn/core-saved-objects-base-server-internal';

import { createResearchEsoKernel } from './research_eso_bootstrap';

export interface ResearchEsoKeys {
  readonly primaryKey: string;
  readonly rotatedKey: string;
}

export interface ResearchEsoProbeResult {
  readonly checks: readonly string[];
  readonly heapUsed: number;
}

interface Attributes extends Record<string, string> {
  secret: string;
  stable: string;
  mutable: string;
}
type SafePartialUpdate = Partial<Pick<Attributes, 'mutable'>>;

const applySafePartialUpdate = (stored: Attributes, patch: SafePartialUpdate): Attributes => ({
  ...stored,
  mutable: patch.mutable ?? stored.mutable,
});

/** RESEARCH ONLY: exercises actual crypto/extension semantics without retaining keys or secrets. */
export const executeResearchEsoProbe = async ({
  primaryKey,
  rotatedKey,
}: ResearchEsoKeys): Promise<ResearchEsoProbeResult> => {
  const checks: string[] = [];
  const ensure = (condition: boolean, stage: string): void => {
    if (!condition) throw new Error(`Research ESO check failed: ${stage}`);
    checks.push(stage);
  };
  const rejects = async (operation: () => Promise<Attributes>): Promise<boolean> => {
    try {
      await operation();
      return false;
    } catch {
      return true;
    }
  };
  // A sink, not a proxy to main: no secret-bearing diagnostics leave this probe.
  const silent = () => undefined;
  const logger: Logger = {
    trace: silent,
    debug: silent,
    info: silent,
    warn: silent,
    error: silent,
    fatal: silent,
    log: silent,
    isLevelEnabled: () => false,
    get: () => logger,
  };
  const type = 'wir_eso_capsule_fixture';
  const registry = new SavedObjectTypeRegistry();
  registry.registerType({
    name: type,
    hidden: true,
    namespaceType: 'single',
    mappings: { properties: {} },
  });
  const registration = {
    type,
    attributesToEncrypt: new Set(['secret']),
    attributesToIncludeInAAD: new Set(['stable']),
  };
  const bootstrap = (key: string, oldKeys: readonly string[]) =>
    createResearchEsoKernel({
      encryptionKey: key,
      decryptionOnlyKeys: oldKeys,
      types: [registration],
      typeRegistry: registry,
      logger,
    });
  const original = bootstrap(primaryKey, []);
  const descriptor = { type, id: 'fixture-id', namespace: 'space-a' };
  const attributes: Attributes = {
    secret: 'sensitive-fixture',
    stable: 'aad-stable',
    mutable: 'before',
  };
  const encrypted = await original.extension.encryptAttributes(descriptor, attributes);
  ensure(encrypted.secret !== attributes.secret, 'encrypt_at_rest');
  const decrypted = await original.service.decryptAttributes(descriptor, encrypted);
  ensure(decrypted.secret === attributes.secret, 'decrypt_round_trip');
  const partial = applySafePartialUpdate(encrypted, { mutable: 'after' });
  const afterPartial = await original.service.decryptAttributes(descriptor, partial);
  ensure(
    afterPartial.secret === attributes.secret &&
      afterPartial.mutable === 'after' &&
      partial.secret === encrypted.secret,
    'safe_partial_update'
  );
  ensure(
    await rejects(() =>
      original.service.decryptAttributes(descriptor, { ...encrypted, stable: 'tampered' })
    ),
    'aad_tamper_rejected'
  );
  ensure(
    await rejects(() =>
      original.service.decryptAttributes({ ...descriptor, namespace: 'space-b' }, encrypted)
    ),
    'namespace_tamper_rejected'
  );
  ensure(
    await rejects(() =>
      original.service.decryptAttributes(descriptor, {
        ...encrypted,
        secret: `${encrypted.secret.slice(0, -2)}xx`,
      })
    ),
    'ciphertext_tamper_rejected'
  );
  const rotated = bootstrap(rotatedKey, [primaryKey]);
  const readOld = await rotated.service.decryptAttributes(descriptor, encrypted);
  ensure(readOld.secret === attributes.secret, 'decryption_only_rotation');
  const reencrypted = await rotated.extension.encryptAttributes(descriptor, readOld);
  ensure(
    await rejects(() => original.service.decryptAttributes(descriptor, reencrypted)),
    'old_key_rejects_rotated_ciphertext'
  );
  const withoutOld = bootstrap(rotatedKey, []);
  ensure(
    await rejects(() => withoutOld.service.decryptAttributes(descriptor, encrypted)),
    'new_key_requires_decryption_only_key'
  );
  const stripped = await original.extension.decryptOrStripResponseAttributes({
    type,
    id: descriptor.id,
    namespaces: ['space-a'],
    references: [],
    attributes: encrypted,
  });
  ensure(!Object.hasOwn(stripped.attributes, 'secret'), 'standard_extension_strips_secret');
  let refusedMissingKey = false;
  try {
    bootstrap('', []);
  } catch {
    refusedMissingKey = true;
  }
  ensure(refusedMissingKey, 'missing_key_rejected');
  return { checks, heapUsed: process.memoryUsage().heapUsed };
};
