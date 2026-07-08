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
 * Reads validated `connector` / `settings` blocks from a full template definition YAML.
 * Invalid or malformed shapes are safely treated as `undefined`.
 */
export const getTemplateSettingsAndConnectorFromYaml = (
  yaml: string
): TemplateSettingsAndConnector => {
  if (!yaml || yaml.trim() === '') {
    return {};
  }

  try {
    const parsed = parseYaml(yaml);
    const record = isPlainRecord(parsed) ? parsed : undefined;
    if (!record) {
      return {};
    }

    const connectorValue = CONNECTOR_KEY in record ? record[CONNECTOR_KEY] : undefined;
    const connector = isValidTemplateConnector(connectorValue) ? connectorValue : undefined;

    const settingsResult =
      SETTINGS_KEY in record ? TemplateSettingsSchema.safeParse(record[SETTINGS_KEY]) : undefined;
    const settings = settingsResult?.success ? settingsResult.data : undefined;

    return { connector, settings };
  } catch {
    return {};
  }
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
 * Writes `connector` / `settings` blocks into a YAML definition. Empty settings and the `.none`
 * (or absent) connector are omitted so we never write empty blocks.
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
