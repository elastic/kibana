/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isExplicitFieldBinding,
  type FieldBinding,
} from '../../common/step_types/provision_connector_from_secret';
import { ProvisioningInputError, type FieldClassification } from './field_classification';

/** Matches the literal value union accepted by `targetConnectorConfig`/`targetConnectorSecrets`. */
export type LiteralFieldValues = Record<string, string | number | boolean>;

export type FieldSource =
  | { kind: 'config-literal' }
  | { kind: 'secrets-literal' }
  | { kind: 'auto-match'; path: string }
  | { kind: 'override'; path: string; field: string };

const describeSource = (source: FieldSource): string => {
  switch (source.kind) {
    case 'config-literal':
      return 'targetConnectorConfig';
    case 'secrets-literal':
      return 'targetConnectorSecrets';
    case 'auto-match':
      return `auto-match from '${source.path}'`;
    case 'override':
      return `explicit override (path '${source.path}', field '${source.field}')`;
  }
};

/**
 * Validates every explicit override's `targetField` before any Vault read is made.
 * Unlike the collision checks below (which, for auto-match bindings, can only run after
 * the corresponding Vault paths are read), this check depends only on the target spec
 * and the step's own input, so it can -- and per the plan, must -- fail fast
 * pre-Vault-call. It enforces two things:
 *
 *  1. The `targetField` must be a recognized field of the target connector type.
 *  2. The `targetField` must be a *secrets*-classified field, never a config field.
 *     A Vault-sourced value routed into a config-bucket field would be persisted in
 *     cleartext in the target connector's saved object (and readable via the connector
 *     GET API), silently defeating the redaction control this whole feature exists to
 *     provide. Vault values may only populate secrets; non-secret config must be
 *     supplied as a literal via `targetConnectorConfig`.
 */
export function validateExplicitOverrideTargetFields(
  fieldBindings: FieldBinding[],
  classification: FieldClassification,
  targetConnectorTypeId: string
): void {
  const configFieldNameSet = new Set(classification.configFieldNames);

  for (const binding of fieldBindings) {
    if (!isExplicitFieldBinding(binding)) {
      continue;
    }
    if (!classification.allFieldNames.has(binding.targetField)) {
      throw new ProvisioningInputError(
        `fieldBindings entry targeting '${binding.targetField}' (from path '${binding.path}', ` +
          `field '${binding.field}') does not match any config or secrets field of target ` +
          `connector type '${targetConnectorTypeId}'.`
      );
    }
    if (configFieldNameSet.has(binding.targetField)) {
      throw new ProvisioningInputError(
        `fieldBindings entry targeting '${binding.targetField}' (from path '${binding.path}', ` +
          `field '${binding.field}') would write a Vault-sourced value into config field ` +
          `'${binding.targetField}' of target connector type '${targetConnectorTypeId}', which ` +
          `is stored in cleartext. Vault-sourced values may only populate secrets fields; ` +
          `supply non-secret config values as literals via targetConnectorConfig instead.`
      );
    }
  }
}

/** Every unique Vault path referenced by any fieldBindings entry, in first-seen order. */
export function collectUniquePaths(fieldBindings: FieldBinding[]): string[] {
  const seen = new Set<string>();
  for (const binding of fieldBindings) {
    seen.add(binding.path);
  }
  return [...seen];
}

/**
 * Resolves the single source for every target field, implementing the field-source
 * collision rule (\u00a75.3): a `targetField` with more than one candidate source fails
 * fast, before any config/secrets merge, with exactly one exception -- an explicit
 * override intentionally superseding an auto-match derived from the identical path.
 *
 * `valuesByPath` must already contain the fetched Vault values (keyed by path) for
 * every path referenced by a `{ path }`-only binding.
 */
export function resolveFieldSources({
  targetConnectorConfig,
  targetConnectorSecrets,
  fieldBindings,
  valuesByPath,
  secretFieldNames,
}: {
  targetConnectorConfig: LiteralFieldValues | undefined;
  targetConnectorSecrets: LiteralFieldValues | undefined;
  fieldBindings: FieldBinding[];
  valuesByPath: Map<string, Record<string, string>>;
  secretFieldNames: Set<string>;
}): Map<string, FieldSource> {
  const candidatesByTargetField = new Map<string, FieldSource[]>();

  const addCandidate = (targetField: string, source: FieldSource) => {
    const list = candidatesByTargetField.get(targetField) ?? [];
    list.push(source);
    candidatesByTargetField.set(targetField, list);
  };

  for (const key of Object.keys(targetConnectorConfig ?? {})) {
    addCandidate(key, { kind: 'config-literal' });
  }
  for (const key of Object.keys(targetConnectorSecrets ?? {})) {
    addCandidate(key, { kind: 'secrets-literal' });
  }

  for (const binding of fieldBindings) {
    if (isExplicitFieldBinding(binding)) {
      addCandidate(binding.targetField, {
        kind: 'override',
        path: binding.path,
        field: binding.field,
      });
      continue;
    }

    const values = valuesByPath.get(binding.path) ?? {};
    // Auto-match intentionally matches only *secrets*-classified field names, never
    // config fields: a `{ path }`-only binding pulls credential material from Vault into
    // the target connector's encrypted secrets bucket. A Vault field whose name happens
    // to collide with a target *config* field is ignored here (rather than routed into a
    // cleartext config value); non-secret config must be supplied via targetConnectorConfig.
    const matchedNames = Object.keys(values).filter((name) => secretFieldNames.has(name));
    if (matchedNames.length === 0) {
      throw new ProvisioningInputError(
        `No fields at Vault path '${binding.path}' match any secrets field of the target ` +
          `connector type. Use an explicit { path, field, targetField } binding to map a Vault ` +
          `field to a specific secrets field, or supply non-secret values via ` +
          `targetConnectorConfig instead.`
      );
    }
    for (const name of matchedNames) {
      addCandidate(name, { kind: 'auto-match', path: binding.path });
    }
  }

  const resolved = new Map<string, FieldSource>();
  for (const [targetField, candidates] of candidatesByTargetField) {
    if (candidates.length === 1) {
      resolved.set(targetField, candidates[0]);
      continue;
    }

    if (candidates.length === 2) {
      const override = candidates.find((c) => c.kind === 'override');
      const autoMatch = candidates.find((c) => c.kind === 'auto-match');
      if (
        override?.kind === 'override' &&
        autoMatch?.kind === 'auto-match' &&
        override.path === autoMatch.path
      ) {
        // Sole intended exception: the override exists specifically to correct/override
        // the auto-match's field selection from that same Vault path.
        resolved.set(targetField, override);
        continue;
      }
    }

    throw new ProvisioningInputError(
      `targetField '${targetField}' has conflicting sources: ${candidates
        .map(describeSource)
        .join(', ')}; remove all but one source (e.g. use an explicit override, or ensure the ` +
        `field only appears in one path/input).`
    );
  }

  return resolved;
}

/**
 * Merges resolved field sources into `config`/`secrets` records, bucketed by the
 * target spec's own structural classification. A resolved field name that (by
 * construction here) isn't in `configFieldNames` is placed in `secrets` by default --
 * biased towards encryption for any name this step doesn't itself recognize, rather
 * than risking a cleartext write.
 */
export function mergeFieldSources({
  resolvedSourceByTargetField,
  configFieldNames,
  targetConnectorConfig,
  targetConnectorSecrets,
  valuesByPath,
}: {
  resolvedSourceByTargetField: Map<string, FieldSource>;
  configFieldNames: string[];
  targetConnectorConfig: LiteralFieldValues | undefined;
  targetConnectorSecrets: LiteralFieldValues | undefined;
  valuesByPath: Map<string, Record<string, string>>;
}): {
  config: Record<string, string | number | boolean>;
  secrets: Record<string, string | number | boolean>;
} {
  const configFieldNameSet = new Set(configFieldNames);
  const config: Record<string, string | number | boolean> = {};
  const secrets: Record<string, string | number | boolean> = {};

  for (const [targetField, source] of resolvedSourceByTargetField) {
    let value: string | number | boolean | undefined;
    switch (source.kind) {
      case 'config-literal':
        value = targetConnectorConfig?.[targetField];
        break;
      case 'secrets-literal':
        value = targetConnectorSecrets?.[targetField];
        break;
      case 'auto-match':
        value = valuesByPath.get(source.path)?.[targetField];
        break;
      case 'override':
        value = valuesByPath.get(source.path)?.[source.field];
        break;
    }
    if (value === undefined) {
      // Unreachable by construction: every resolved source was derived from a key that
      // was already confirmed present (literal object key, or a name/field found in an
      // already-fetched Vault path). Defensive guard against a future refactor breaking
      // that invariant, rather than silently writing `undefined` into a connector field.
      throw new ProvisioningInputError(
        `Internal error resolving a value for target field '${targetField}'.`
      );
    }

    const isVaultSourced = source.kind === 'auto-match' || source.kind === 'override';
    if (isVaultSourced && configFieldNameSet.has(targetField)) {
      // Defense in depth: resolveFieldSources/validateExplicitOverrideTargetFields already
      // prevent a Vault-sourced value from ever targeting a config field, so this is
      // unreachable. It fails closed (never writes a Vault value into cleartext config) if
      // a future refactor breaks that invariant, rather than silently leaking.
      throw new ProvisioningInputError(
        `Internal error: refusing to write a Vault-sourced value into cleartext config field ` +
          `'${targetField}'.`
      );
    }

    if (configFieldNameSet.has(targetField)) {
      config[targetField] = value;
    } else {
      secrets[targetField] = value;
    }
  }

  return { config, secrets };
}
