/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { YAMLMap } from 'yaml';
import { parse as parseYaml, parseDocument, isMap } from 'yaml';
import type { CaseConnectorWithoutName } from '../../../../common/types/domain_zod/connector/v1';
import { ConnectorTypes } from '../../../../common/types/domain';
import type { TemplateSettings } from '../../../../common/types/domain/template/v1';
import { TemplateSettingsSchema } from '../../../../common/types/domain/template/v1';

const CONNECTOR_KEY = 'connector';
const SETTINGS_KEY = 'settings';

export interface TemplateSettingsAndConnector {
  connector?: CaseConnectorWithoutName;
  settings?: TemplateSettings;
}

export interface SplitTemplateDefinition extends TemplateSettingsAndConnector {
  /** The definition YAML with the `connector` and `settings` blocks removed. */
  fieldsYaml: string;
}

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === 'object' && !Array.isArray(value);

const CONNECTOR_TYPES = new Set<string>(Object.values(ConnectorTypes));

/**
 * Structural guard for a template's connector block. We deliberately don't validate the per-type
 * `fields` against the full connector schema here: templates legitimately carry a partial `fields`
 * block (the connector form fills in the rest and the shape is re-validated on save/merge). We only
 * guard the discriminant (`type`) and `id` so a malformed block never reaches the Settings form.
 */
const isValidTemplateConnector = (value: unknown): value is CaseConnectorWithoutName => {
  if (!isPlainRecord(value)) {
    return false;
  }
  const { type, id } = value;
  return typeof id === 'string' && typeof type === 'string' && CONNECTOR_TYPES.has(type);
};

/**
 * Canonical "no meaningful settings" form. Drops undefined keys and collapses an empty object to
 * `undefined`, so the form's transient shapes (`{}`, `{ syncAlerts: undefined }`) compare equal to
 * an unset value. Used for both persistence and unsaved-change detection.
 */
export const normalizeTemplateSettings = (
  settings?: TemplateSettings
): TemplateSettings | undefined => {
  if (settings == null) return undefined;
  const normalized: TemplateSettings = {};
  if (settings.syncAlerts !== undefined) normalized.syncAlerts = settings.syncAlerts;
  if (settings.extractObservables !== undefined)
    normalized.extractObservables = settings.extractObservables;
  return Object.keys(normalized).length === 0 ? undefined : normalized;
};

/**
 * Canonical "no connector" form: the `.none` (or absent) connector collapses to `undefined`, so the
 * connector form's "no connector" shape (`{ type: 'none', id: 'none', fields: null }`) compares
 * equal to an unset value. Used for both persistence and unsaved-change detection.
 */
export const normalizeTemplateConnector = (
  connector?: CaseConnectorWithoutName
): CaseConnectorWithoutName | undefined =>
  connector == null || connector.type === ConnectorTypes.none ? undefined : connector;

/**
 * Splits a template definition into the fields-only YAML that stays in the editor buffer and the
 * `connector` / `settings` blocks that are managed by the Settings form.
 *
 * The `connector` and `settings` keys are removed from the YAML via the `yaml` library's document
 * API so the formatting and comments of the remaining (fields) content are preserved. Their parsed
 * values are validated against the domain schemas (invalid shapes seed the form as `undefined`
 * rather than reaching the Settings form unvalidated) and returned so the Settings form can be
 * seeded. Invalid YAML is returned untouched.
 */
export const splitTemplateDefinition = (yaml: string): SplitTemplateDefinition => {
  if (!yaml || yaml.trim() === '') {
    return { fieldsYaml: yaml };
  }

  try {
    const parsed = parseYaml(yaml);
    const record = isPlainRecord(parsed) ? parsed : undefined;
    const hasConnector = record !== undefined && CONNECTOR_KEY in record;
    const hasSettings = record !== undefined && SETTINGS_KEY in record;

    // Nothing to strip — return the buffer untouched so we never reformat a fields-only definition.
    if (!hasConnector && !hasSettings) {
      return { fieldsYaml: yaml };
    }

    // Validate rather than blindly cast: migrated/imported definitions flow through here, so a
    // malformed connector/settings shape must not reach the Settings form. Failures seed `undefined`.
    const connectorValue = hasConnector ? record[CONNECTOR_KEY] : undefined;
    const connector: CaseConnectorWithoutName | undefined = isValidTemplateConnector(connectorValue)
      ? connectorValue
      : undefined;

    const settingsResult = hasSettings
      ? TemplateSettingsSchema.safeParse(record[SETTINGS_KEY])
      : undefined;
    const settings: TemplateSettings | undefined = settingsResult?.success
      ? settingsResult.data
      : undefined;

    const doc = parseDocument(yaml);
    const root = doc.contents;
    if (isMap(root)) {
      const rootMap = root as YAMLMap<unknown, unknown>;
      rootMap.delete(CONNECTOR_KEY);
      rootMap.delete(SETTINGS_KEY);
    }

    return { fieldsYaml: doc.toString(), connector, settings };
  } catch {
    return { fieldsYaml: yaml };
  }
};

/**
 * Merges the form-managed `connector` / `settings` blocks back into the fields YAML to produce the
 * complete definition that gets persisted. Empty settings and the `.none` (or absent) connector are
 * omitted so we never write empty blocks. Preserves the fields content's formatting and comments.
 */
export const mergeTemplateDefinition = (
  fieldsYaml: string,
  { connector, settings }: TemplateSettingsAndConnector
): string => {
  try {
    const doc = parseDocument(fieldsYaml ?? '');
    const root = doc.contents;

    if (!isMap(root)) {
      return fieldsYaml;
    }

    const rootMap = root as YAMLMap<unknown, unknown>;

    const normalizedSettings = normalizeTemplateSettings(settings);
    if (normalizedSettings) {
      rootMap.set(SETTINGS_KEY, doc.createNode(normalizedSettings));
    } else {
      rootMap.delete(SETTINGS_KEY);
    }

    const normalizedConnector = normalizeTemplateConnector(connector);
    if (normalizedConnector) {
      rootMap.set(CONNECTOR_KEY, doc.createNode(normalizedConnector));
    } else {
      rootMap.delete(CONNECTOR_KEY);
    }

    return doc.toString();
  } catch {
    return fieldsYaml;
  }
};
