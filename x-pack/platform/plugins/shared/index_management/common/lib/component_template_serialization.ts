/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TemplateFromEs,
  ComponentTemplateFromEs,
  ComponentTemplateDeserialized,
  ComponentTemplateListItem,
  ComponentTemplateSerialized,
} from '../types';
import type { DataStreamOptions } from '../types/data_streams';
import { buildTemplateMappings, buildTemplateSettings } from './utils';

const hasEntries = (data: object = {}) => Object.entries(data).length > 0;

/**
 * Normalize a list of component templates to a map where each key
 * is a component template name, and the value is an array of index templates name using it
 *
 * @example
 *
 {
   "comp-1": [
     "template-1",
     "template-2"
   ],
   "comp2": [
     "template-1",
     "template-2"
   ]
 }
 *
 * @param indexTemplatesEs List of component templates
 */

const getIndexTemplatesToUsedBy = (indexTemplatesEs: TemplateFromEs[]) => {
  return indexTemplatesEs.reduce((acc, item) => {
    if (item.index_template.composed_of) {
      item.index_template.composed_of.forEach((component) => {
        acc[component] = acc[component] ? [...acc[component], item.name] : [item.name];
      });
    }
    return acc;
  }, {} as { [key: string]: string[] });
};

export function deserializeComponentTemplate(
  componentTemplateEs: ComponentTemplateFromEs,
  indexTemplatesEs: TemplateFromEs[]
) {
  const { name, component_template: componentTemplate } = componentTemplateEs;
  const { template, _meta, version, deprecated } = componentTemplate;

  const indexTemplatesToUsedBy = getIndexTemplatesToUsedBy(indexTemplatesEs);

  // When deserializing, preferMappingsSourceMode is false by default.
  // This means _source.mode is not migrated to settings so the flyout shows the raw payload correctly.
  const migratedSettings = buildTemplateSettings(template, undefined);
  const migratedMappings = buildTemplateMappings(template);
  const { mappings: _templateMappings, settings: _templateSettings, ...otherTemplate } = template;
  const migratedTemplate = {
    ...otherTemplate,
    ...(migratedMappings ? { mappings: migratedMappings } : {}),
    ...(migratedSettings ? { settings: migratedSettings } : {}),
  };

  const deserializedComponentTemplate: ComponentTemplateDeserialized = {
    name,
    template: migratedTemplate,
    version,
    _meta,
    deprecated,
    _kbnMeta: {
      usedBy: indexTemplatesToUsedBy[name] || [],
      isManaged: Boolean(_meta?.managed === true),
    },
  };

  return deserializedComponentTemplate;
}

export function deserializeComponentTemplateList(
  componentTemplatesEs: ComponentTemplateFromEs[],
  indexTemplatesEs: TemplateFromEs[]
) {
  const indexTemplatesToUsedBy = getIndexTemplatesToUsedBy(indexTemplatesEs);

  return componentTemplatesEs.map((componentTemplateEs) => {
    const { name, component_template: componentTemplate } = componentTemplateEs;
    const { template, _meta, deprecated } = componentTemplate;

    const componentTemplateListItem: ComponentTemplateListItem = {
      name,
      usedBy: indexTemplatesToUsedBy[name] || [],
      isDeprecated: Boolean(deprecated === true),
      isManaged: Boolean(_meta?.managed === true),
      hasSettings: hasEntries(template.settings),
      hasMappings: hasEntries(template.mappings),
      hasAliases: hasEntries(template.aliases),
    };

    return componentTemplateListItem;
  });
}

export function serializeComponentTemplate(
  componentTemplateDeserialized: ComponentTemplateDeserialized,
  dataStreamOptions?: DataStreamOptions
): ComponentTemplateSerialized {
  const { version, template, _meta, deprecated } = componentTemplateDeserialized;

  // Normalize deprecated `_source.mode` (mappings) into `index.mapping.source.mode` (settings)
  // and strip the deprecated `_source.mode` from mappings.
  // During serialization, we prefer the source mode from mappings since it represents the latest user choice in the UI.
  const migratedSettings = buildTemplateSettings(template, undefined, {
    preferMappingsSourceMode: true,
  });
  const migratedMappings = buildTemplateMappings(template, { preferMappingsSourceMode: true });
  const { mappings: _templateMappings, settings: _templateSettings, ...otherTemplate } = template;

  // If the existing component template contains data stream options, we need to persist them.
  // Otherwise, they will be lost when the component template is updated.
  const updatedTemplate = {
    ...otherTemplate,
    ...(migratedMappings ? { mappings: migratedMappings } : {}),
    ...(migratedSettings ? { settings: migratedSettings } : {}),
    ...(dataStreamOptions && { data_stream_options: dataStreamOptions }),
  };

  return {
    version,
    template: updatedTemplate,
    _meta,
    deprecated,
  };
}
