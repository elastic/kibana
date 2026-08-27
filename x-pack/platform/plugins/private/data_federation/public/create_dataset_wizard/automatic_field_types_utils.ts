/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TestConfigurationPreviewField } from './test_configuration_preview_utils';

export const seedAutomaticFieldTypesFromInferred = (
  inferredFields: readonly TestConfigurationPreviewField[]
): Record<string, string> =>
  Object.fromEntries(inferredFields.map((field) => [field.name, field.type ?? 'keyword']));

export const automaticFieldTypesToMappings = (
  fieldTypes: Record<string, string>
): Record<string, object> => ({
  properties: Object.fromEntries(
    Object.entries(fieldTypes).map(([name, type]) => [name, { type }])
  ),
});

export const mappingsToAutomaticFieldTypes = (
  mappings: Record<string, unknown>
): Record<string, string> => {
  const properties = mappings.properties;
  const source =
    properties && typeof properties === 'object'
      ? (properties as Record<string, { type?: string }>)
      : (mappings as Record<string, { type?: string }>);

  return Object.fromEntries(
    Object.entries(source)
      .filter(([, mapping]) => typeof mapping?.type === 'string')
      .map(([name, mapping]) => [name, mapping.type as string])
  );
};

export const getDynamicInferredFields = (
  inferredFields: readonly TestConfigurationPreviewField[],
  mappedFieldTypes: Record<string, string>
): TestConfigurationPreviewField[] =>
  inferredFields.filter((field) => !(field.name in mappedFieldTypes));

export const mergeMissingAutomaticFieldTypes = (
  currentFieldTypes: Record<string, string>,
  inferredFieldTypes: Record<string, string>
): Record<string, string> => {
  const merged = { ...currentFieldTypes };

  for (const [name, type] of Object.entries(inferredFieldTypes)) {
    if (!(name in merged)) {
      merged[name] = type;
    }
  }

  return merged;
};

export const countModifiedAutomaticFieldTypesForFlow3 = (
  inferredFields: readonly TestConfigurationPreviewField[],
  fieldTypes: Record<string, string>
): number => {
  const inferredTypes = seedAutomaticFieldTypesFromInferred(inferredFields);
  const inferredNames = new Set(Object.keys(inferredTypes));
  const currentNames = new Set(Object.keys(fieldTypes));

  let modifiedCount = 0;

  for (const name of inferredNames) {
    if (!currentNames.has(name) || fieldTypes[name] !== inferredTypes[name]) {
      modifiedCount += 1;
    }
  }

  for (const name of currentNames) {
    if (!inferredNames.has(name)) {
      modifiedCount += 1;
    }
  }

  return modifiedCount;
};
