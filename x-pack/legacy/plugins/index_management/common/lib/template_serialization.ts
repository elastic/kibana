/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Template, TemplateEs, TemplateListItem } from '../types';

const hasEntries = (data: object = {}) => Object.entries(data).length > 0;

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
    version,
    order,
    index_patterns: indexPatterns,
    settings,
    aliases,
    mappings,
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
    version,
    order,
    indexPatterns: indexPatterns.sort(),
    settings,
    aliases,
    mappings,
    ilmPolicy: settings && settings.index && settings.index.lifecycle,
    isManaged: Boolean(managedTemplatePrefix && name.startsWith(managedTemplatePrefix)),
  };

  return deserializedTemplate;
}
