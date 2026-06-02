/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TemplateDeserialized,
  LegacyTemplateSerialized,
  TemplateSerialized,
  TemplateListItem,
  TemplateType,
  IndexMode,
} from '../types';
import { deserializeESLifecycle } from './data_stream_utils';
import {
  allowAutoCreateRadioValues,
  allowAutoCreateRadioIds,
  LOGSDB_INDEX_MODE,
} from '../constants';
import type { DataStreamOptions } from '../types/data_streams';
import { buildTemplateMappings, buildTemplateSettings } from './utils';

const hasEntries = (data: object = {}) => Object.entries(data).length > 0;

export function serializeTemplate(
  templateDeserialized: TemplateDeserialized,
  dataStreamOptions?: DataStreamOptions
): TemplateSerialized {
  const {
    version,
    priority,
    indexPatterns,
    template,
    composedOf,
    ignoreMissingComponentTemplates,
    dataStream,
    indexMode,
    _meta,
    allowAutoCreate,
    deprecated,
  } = templateDeserialized;

  // Build settings object, properly handling index mode source mode.
  // During serialization, we prefer the source mode from mappings since it represents the latest user choice in the UI.
  const settings = buildTemplateSettings(template, indexMode, { preferMappingsSourceMode: true });
  const mappings = buildTemplateMappings(template, { preferMappingsSourceMode: true });

  // Separate settings and lifecycle from other template properties so we can rebuild template cleanly
  const {
    settings: _templateSettings,
    lifecycle,
    mappings: _templateMappings,
    ...otherTemplateProperties
  } = template || {};

  const showTemplateOptions =
    Object.keys(otherTemplateProperties).length > 0 ||
    (mappings && Object.keys(mappings).length > 0) ||
    (settings && Object.keys(settings).length > 0) ||
    (lifecycle && Object.keys(lifecycle).length > 0) ||
    dataStreamOptions;

  const templateOptions = {
    ...otherTemplateProperties,
    ...(mappings && { mappings }),
    ...(settings && { settings }),
    ...(lifecycle && { lifecycle }),
    // If the existing template contains data stream options, we need to persist them.
    // Otherwise, they will be lost when the template is updated.
    ...(dataStreamOptions && { data_stream_options: dataStreamOptions }),
  };

  return {
    version,
    priority,
    ...(showTemplateOptions && { template: templateOptions }),
    index_patterns: indexPatterns,
    data_stream: dataStream,
    composed_of: composedOf,
    ignore_missing_component_templates: ignoreMissingComponentTemplates,
    allow_auto_create: allowAutoCreateRadioValues?.[allowAutoCreate],
    _meta,
    deprecated,
  };
}

export function deserializeTemplate(
  templateEs: TemplateSerialized & { name: string },
  cloudManagedTemplatePrefix?: string,
  isLogsdbEnabled?: boolean
): TemplateDeserialized {
  const {
    name,
    version,
    index_patterns: indexPatterns,
    template = {},
    priority,
    _meta,
    composed_of: composedOf,
    ignore_missing_component_templates: ignoreMissingComponentTemplates,
    data_stream: dataStream,
    deprecated,
    allow_auto_create: allowAutoCreate,
  } = templateEs;
  const { settings } = template;

  let type: TemplateType = 'default';
  if (Boolean(cloudManagedTemplatePrefix && name.startsWith(cloudManagedTemplatePrefix))) {
    type = 'cloudManaged';
  } else if (name.startsWith('.')) {
    type = 'system';
  } else if (Boolean(_meta?.managed === true)) {
    type = 'managed';
  }

  const ilmPolicyName = settings?.index?.lifecycle?.name;

  const indexMode = (settings?.index?.mode ??
    (isLogsdbEnabled && indexPatterns.some((pattern) => pattern === 'logs-*-*')
      ? LOGSDB_INDEX_MODE
      : undefined)) as IndexMode | undefined;

  // When deserializing, preferMappingsSourceMode is false by default.
  // This means _source.mode is not migrated to settings so the flyout shows the raw payload correctly.
  const migratedSettings = buildTemplateSettings(template, indexMode);
  const migratedMappings = buildTemplateMappings(template);
  const { mappings: _templateMappings, settings: _templateSettings, ...otherTemplate } = template;
  const migratedTemplate = {
    ...otherTemplate,
    ...(migratedSettings ? { settings: migratedSettings } : {}),
    ...(migratedMappings ? { mappings: migratedMappings } : {}),
  };

  const deserializedTemplate: TemplateDeserialized = {
    name,
    version,
    priority,
    ...(template.lifecycle ? { lifecycle: deserializeESLifecycle(template.lifecycle) } : {}),
    indexPatterns: indexPatterns.sort(),
    template: migratedTemplate,
    indexMode,
    ilmPolicy: ilmPolicyName ? { name: ilmPolicyName } : undefined,
    composedOf: composedOf ?? [],
    ignoreMissingComponentTemplates: ignoreMissingComponentTemplates ?? [],
    dataStream,
    allowAutoCreate:
      allowAutoCreate === true
        ? allowAutoCreateRadioIds.TRUE_RADIO_OPTION
        : allowAutoCreate === false
        ? allowAutoCreateRadioIds.FALSE_RADIO_OPTION
        : allowAutoCreateRadioIds.NO_OVERWRITE_RADIO_OPTION,
    _meta,
    deprecated,
    _kbnMeta: {
      type,
      hasDatastream: Boolean(dataStream),
    },
  };

  return deserializedTemplate;
}

export function deserializeTemplateList(
  indexTemplates: Array<{ name: string; index_template: TemplateSerialized }>,
  cloudManagedTemplatePrefix?: string
): TemplateListItem[] {
  return indexTemplates.map(({ name, index_template: templateSerialized }) => {
    const { template: { mappings, settings, aliases } = {}, ...deserializedTemplate } =
      deserializeTemplate({ name, ...templateSerialized }, cloudManagedTemplatePrefix);

    return {
      ...deserializedTemplate,
      hasSettings: hasEntries(settings),
      hasAliases: hasEntries(aliases),
      hasMappings: hasEntries(mappings),
    };
  });
}

/**
 * ------------------------------------------
 * --------- LEGACY INDEX TEMPLATES ---------
 * ------------------------------------------
 */

export function serializeLegacyTemplate({
  template,
  indexPatterns,
  version,
  order,
  indexMode,
}: TemplateDeserialized): LegacyTemplateSerialized {
  const migratedTemplatePayload = {
    settings: template?.settings,
    mappings: template?.mappings,
  } as TemplateDeserialized['template'];

  const migratedSettings = buildTemplateSettings(
    migratedTemplatePayload,
    (indexMode ?? (template?.settings?.index?.mode as IndexMode | undefined)) as
      | IndexMode
      | undefined,
    { preferMappingsSourceMode: true }
  );
  const migratedMappings = buildTemplateMappings(migratedTemplatePayload, {
    preferMappingsSourceMode: true,
  });

  return {
    version,
    order,
    index_patterns: indexPatterns,
    settings: migratedSettings,
    aliases: template?.aliases,
    mappings: migratedMappings,
  };
}

export function deserializeLegacyTemplate(
  templateEs: LegacyTemplateSerialized & { name: string },
  cloudManagedTemplatePrefix?: string,
  isLogsdbEnabled?: boolean
): TemplateDeserialized {
  const { settings, aliases, mappings, ...rest } = templateEs;

  const deserializedTemplate = deserializeTemplate(
    { ...rest, template: { aliases, settings, mappings } },
    cloudManagedTemplatePrefix,
    isLogsdbEnabled
  );

  return {
    ...deserializedTemplate,
    order: templateEs.order,
    _kbnMeta: {
      ...deserializedTemplate._kbnMeta,
      isLegacy: true,
    },
  };
}

export function deserializeLegacyTemplateList(
  indexTemplatesByName: { [key: string]: LegacyTemplateSerialized },
  cloudManagedTemplatePrefix?: string
): TemplateListItem[] {
  return Object.entries(indexTemplatesByName).map(([name, templateSerialized]) => {
    const { template: { mappings, settings, aliases } = {}, ...deserializedTemplate } =
      deserializeLegacyTemplate({ name, ...templateSerialized }, cloudManagedTemplatePrefix);

    return {
      ...deserializedTemplate,
      hasSettings: hasEntries(settings),
      hasAliases: hasEntries(aliases),
      hasMappings: hasEntries(mappings),
    };
  });
}
