/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { YAMLMap } from 'yaml';
import { isMap, parse as yamlParse, parseDocument } from 'yaml';
import type { TemplateMetadata } from './template_metadata';

export const TEMPLATE_NAME_YAML_KEY = 'template_name';
export const TEMPLATE_DESCRIPTION_YAML_KEY = 'template_description';
export const TEMPLATE_TAGS_YAML_KEY = 'template_tags';
const LEGACY_TEMPLATE_NAME_YAML_KEY = 'templateName';
const LEGACY_TEMPLATE_DESCRIPTION_YAML_KEY = 'templateDescription';
const LEGACY_TEMPLATE_TAGS_YAML_KEY = 'templateTags';

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === 'object' && !Array.isArray(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const getTemplateMetadataFromRecord = (
  record: Record<string, unknown>,
  fallback: TemplateMetadata
): TemplateMetadata => ({
  name:
    typeof record[TEMPLATE_NAME_YAML_KEY] === 'string'
      ? record[TEMPLATE_NAME_YAML_KEY]
      : typeof record[LEGACY_TEMPLATE_NAME_YAML_KEY] === 'string'
      ? record[LEGACY_TEMPLATE_NAME_YAML_KEY]
      : fallback.name,
  description:
    typeof record[TEMPLATE_DESCRIPTION_YAML_KEY] === 'string'
      ? record[TEMPLATE_DESCRIPTION_YAML_KEY]
      : typeof record[LEGACY_TEMPLATE_DESCRIPTION_YAML_KEY] === 'string'
      ? record[LEGACY_TEMPLATE_DESCRIPTION_YAML_KEY]
      : fallback.description,
  tags: isStringArray(record[TEMPLATE_TAGS_YAML_KEY])
    ? record[TEMPLATE_TAGS_YAML_KEY]
    : isStringArray(record[LEGACY_TEMPLATE_TAGS_YAML_KEY])
    ? record[LEGACY_TEMPLATE_TAGS_YAML_KEY]
    : fallback.tags,
});

export const getTemplateMetadataFromYaml = (
  definitionYaml: string,
  fallback: TemplateMetadata
): TemplateMetadata => {
  if (!definitionYaml || definitionYaml.trim() === '') {
    return fallback;
  }

  try {
    const parsed = yamlParse(definitionYaml);
    if (!isPlainRecord(parsed)) {
      return fallback;
    }

    return getTemplateMetadataFromRecord(parsed, fallback);
  } catch {
    return fallback;
  }
};

export const setTemplateMetadataInYaml = (
  definitionYaml: string,
  metadata: TemplateMetadata
): string => {
  try {
    const doc = parseDocument(definitionYaml ?? '');
    if (!isMap(doc.contents)) {
      return definitionYaml;
    }

    const root = doc.contents as YAMLMap<unknown, unknown>;
    const hasTemplateNameKey =
      root.has(TEMPLATE_NAME_YAML_KEY) || root.has(LEGACY_TEMPLATE_NAME_YAML_KEY);
    const hasTemplateDescriptionKey =
      root.has(TEMPLATE_DESCRIPTION_YAML_KEY) || root.has(LEGACY_TEMPLATE_DESCRIPTION_YAML_KEY);
    const hasTemplateTagsKey =
      root.has(TEMPLATE_TAGS_YAML_KEY) || root.has(LEGACY_TEMPLATE_TAGS_YAML_KEY);

    root.delete(LEGACY_TEMPLATE_NAME_YAML_KEY);
    root.delete(LEGACY_TEMPLATE_DESCRIPTION_YAML_KEY);
    root.delete(LEGACY_TEMPLATE_TAGS_YAML_KEY);

    if (metadata.name.trim().length > 0) {
      root.set(TEMPLATE_NAME_YAML_KEY, metadata.name);
    } else if (hasTemplateNameKey) {
      // If the key already existed, keep it visible when cleared so the YAML shape does not
      // unexpectedly disappear while users edit metadata values.
      root.set(TEMPLATE_NAME_YAML_KEY, '');
    } else {
      root.delete(TEMPLATE_NAME_YAML_KEY);
    }

    if (metadata.description.trim().length > 0) {
      root.set(TEMPLATE_DESCRIPTION_YAML_KEY, metadata.description);
    } else if (hasTemplateDescriptionKey) {
      root.set(TEMPLATE_DESCRIPTION_YAML_KEY, '');
    } else {
      root.delete(TEMPLATE_DESCRIPTION_YAML_KEY);
    }

    const tags = metadata.tags.filter((tag) => tag.trim().length > 0);
    if (tags.length > 0) {
      root.set(TEMPLATE_TAGS_YAML_KEY, doc.createNode(tags));
    } else if (hasTemplateTagsKey) {
      root.set(TEMPLATE_TAGS_YAML_KEY, doc.createNode([]));
    } else {
      root.delete(TEMPLATE_TAGS_YAML_KEY);
    }

    return doc.toString();
  } catch {
    return definitionYaml;
  }
};
