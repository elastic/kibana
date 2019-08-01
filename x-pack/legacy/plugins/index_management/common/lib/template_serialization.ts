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
  } catch (e) {
    // Silently swallow parsing errors since parsing validation is done on client
    // so we should never reach this point
  }

  return parsedJson;
};

const hasEntries = (data: object) => {
  return data ? Object.entries(data).length > 0 : false;
};

export function deserializeTemplateList(indexTemplatesByName: any): TemplateListItem[] {
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
    mappings,
  };

  return serializedTemplate;
}

export function deserializeTemplate(templateEs: TemplateEs): Template {
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
    version: typeof version !== 'undefined' ? version.toString() : undefined,
    order: typeof order !== 'undefined' ? order.toString() : undefined,
    indexPatterns: indexPatterns.sort(),
    settings: settings && hasEntries(settings) ? JSON.stringify(settings, null, 2) : undefined,
    aliases: aliases && hasEntries(aliases) ? JSON.stringify(aliases, null, 2) : undefined,
    mappings: mappings && hasEntries(mappings) ? mappings : undefined,
    ilmPolicy: settings && settings.index && settings.index.lifecycle,
  };

  return deserializedTemplate;
}
