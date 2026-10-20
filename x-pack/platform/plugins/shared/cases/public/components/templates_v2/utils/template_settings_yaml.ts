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
import { NONE_CONNECTOR_ID } from '../../../../common/constants';
import type { TemplateSettings } from '../../../../common/types/domain/template/v1';
import { TemplateSettingsSchema } from '../../../../common/types/domain/template/v1';

const CONNECTOR_KEY = 'connector';
const SETTINGS_KEY = 'settings';

/**
 * The `.none` connector block. `connector` is an always-present block in the template YAML, so a
 * template with no default connector is written as this explicit `.none` shape rather than omitting
 * the key. `normalizeTemplateConnector` collapses it back to `undefined` for the Settings form and
 * for unsaved-change detection.
 */
export const NONE_TEMPLATE_CONNECTOR: CaseConnectorWithoutName = {
  type: ConnectorTypes.none,
  id: NONE_CONNECTOR_ID,
  fields: null,
};

/** Both settings keys, defaulting to `false` — the always-present `settings` block shape. */
export const getExplicitTemplateSettings = (settings?: TemplateSettings): TemplateSettings => ({
  syncAlerts: settings?.syncAlerts ?? false,
  extractObservables: settings?.extractObservables ?? false,
});

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
 * Removes the renderer-managed `connector` and `settings` blocks from a definition YAML, leaving the
 * "case blueprint" (case defaults + `fields`) that the Fields tab edits two-way. Under Option 2 the
 * connector and settings live as panel state (never in the editor buffer); they are lifted out on
 * load and merged back in on save (see mergeTemplateDefinition). Preserves the author's formatting
 * and comments for everything else.
 */
export const stripTemplateConfigBlocks = (definitionYaml: string): string => {
  try {
    const doc = parseDocument(definitionYaml ?? '');
    if (!isMap(doc.contents)) {
      return definitionYaml;
    }
    const root = doc.contents as YAMLMap<unknown, unknown>;
    let modified = false;
    for (const key of [CONNECTOR_KEY, SETTINGS_KEY]) {
      if (root.has(key)) {
        root.delete(key);
        modified = true;
      }
    }
    return modified ? doc.toString() : definitionYaml;
  } catch {
    return definitionYaml;
  }
};

/**
 * Composes the COMPLETE persisted definition from the edited blueprint YAML plus the panel-owned
 * `settings` and `connector`. Called once at save time (never per keystroke). `settings` is written
 * explicitly with both keys so the stored definition is complete; the `.none` connector is omitted
 * (it is the implicit default, matching the v1→v2 migration output), and any stale connector block
 * is removed when there is no real connector.
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

    rootMap.set(SETTINGS_KEY, doc.createNode(getExplicitTemplateSettings(settings)));

    const normalizedConnector = normalizeTemplateConnector(connector);
    if (normalizedConnector) {
      rootMap.set(CONNECTOR_KEY, doc.createNode(normalizedConnector));
    } else if (rootMap.has(CONNECTOR_KEY)) {
      rootMap.delete(CONNECTOR_KEY);
    }

    return doc.toString();
  } catch {
    return fieldsYaml;
  }
};
