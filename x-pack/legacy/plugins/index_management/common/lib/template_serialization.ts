/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Template, TemplateEs, TemplateListItem } from '../types';

const parseJson = (jsonString: string) => {
  let parsedJson;

  try {
    parsedJson = JSON.parse(jsonString);

    // Do not send empty object
    if (!hasEntries(parsedJson)) {
      parsedJson = undefined;
    }
  } catch (e) {
    // Silently swallow parsing errors since parsing validation is done on client
    // so we should never reach this point
  }

  return parsedJson;
};

const hasEntries = (data: object = {}) => Object.entries(data).length > 0;

const stringifyJson = (json: any) => {
  return JSON.stringify(json, null, 2);
};

export function deserializeTemplateList(
  indexTemplatesByName: any,
  managedTemplatePrefix?: string
): TemplateListItem[] {
  const indexTemplateNames: string[] = Object.keys(indexTemplatesByName);

  const deserializedTemplates: TemplateListItem[] = indexTemplateNames.map((name: string) => {
    const {
      version,
      order,
      index_patterns: indexPatterns = [],
      settings = {},
      aliases = {},
      mappings = {},
    } = indexTemplatesByName[name];

    return {
      name,
      version,
      order,
      indexPatterns: indexPatterns.sort(),
      hasSettings: hasEntries(settings),
      hasAliases: hasEntries(aliases),
      hasMappings: hasEntries(mappings),
      ilmPolicy: settings && settings.index && settings.index.lifecycle,
      isManaged: Boolean(managedTemplatePrefix && name.startsWith(managedTemplatePrefix)),
    };
  });

  return deserializedTemplates;
}

export function serializeTemplate(template: Template): TemplateEs {
  const { name, version, order, indexPatterns, settings, aliases, mappings } = template;

  const serializedTemplate: TemplateEs = {
    name,
    version: version ? Number(version) : undefined,
    order: order ? Number(order) : undefined,
    index_patterns: indexPatterns,
    settings: settings ? parseJson(settings) : undefined,
    aliases: aliases ? parseJson(aliases) : undefined,
    mappings: mappings ? parseJson(mappings) : undefined,
  };

  return serializedTemplate;
}

export function deserializeTemplate(
  templateEs: TemplateEs,
  managedTemplatePrefix?: string
): Template {
  const {
    name,
    version,
    order,
    index_patterns: indexPatterns,
    settings,
    aliases,
    mappings,
  } = templateEs;

  const deserializedTemplate: Template = {
    name,
    version: version || version === 0 ? version : '',
    order: order || order === 0 ? order : '',
    indexPatterns: indexPatterns.sort(),
    settings: hasEntries(settings) ? stringifyJson(settings) : undefined,
    aliases: hasEntries(aliases) ? stringifyJson(aliases) : undefined,
    mappings: hasEntries(mappings) ? stringifyJson(mappings) : undefined,
    ilmPolicy: settings && settings.index && settings.index.lifecycle,
    isManaged: Boolean(managedTemplatePrefix && name.startsWith(managedTemplatePrefix)),
  };

  return deserializedTemplate;
}
