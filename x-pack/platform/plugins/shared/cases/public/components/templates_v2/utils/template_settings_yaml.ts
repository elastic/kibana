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

/**
 * Splits a template definition into the fields-only YAML that stays in the editor buffer and the
 * `connector` / `settings` blocks that are managed by the Settings form.
 *
 * The `connector` and `settings` keys are removed from the YAML via the `yaml` library's document
 * API so the formatting and comments of the remaining (fields) content are preserved. Their parsed
 * values are returned so the Settings form can be seeded. Invalid YAML is returned untouched.
 */
export const splitTemplateDefinition = (yaml: string): SplitTemplateDefinition => {
  if (!yaml || yaml.trim() === '') {
    return { fieldsYaml: yaml };
  }

  try {
    const parsed = parseYaml(yaml);
    const connector = isPlainRecord(parsed)
      ? (parsed[CONNECTOR_KEY] as CaseConnectorWithoutName | undefined)
      : undefined;
    const settings = isPlainRecord(parsed)
      ? (parsed[SETTINGS_KEY] as TemplateSettings | undefined)
      : undefined;

    // Nothing to strip — return the buffer untouched so we never reformat a fields-only definition.
    if (connector === undefined && settings === undefined) {
      return { fieldsYaml: yaml };
    }

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

    const hasSettings =
      settings != null &&
      (settings.syncAlerts !== undefined || settings.extractObservables !== undefined);
    if (hasSettings) {
      rootMap.set(SETTINGS_KEY, doc.createNode(settings));
    } else {
      rootMap.delete(SETTINGS_KEY);
    }

    const hasConnector =
      connector != null && connector.type != null && connector.type !== ConnectorTypes.none;
    if (hasConnector) {
      rootMap.set(CONNECTOR_KEY, doc.createNode(connector));
    } else {
      rootMap.delete(CONNECTOR_KEY);
    }

    return doc.toString();
  } catch {
    return fieldsYaml;
  }
};
