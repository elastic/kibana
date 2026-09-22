/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationTemplate,
  ConversationTemplateInputType,
  MetadataFieldValue,
  SerializedMetadataValue,
} from '@kbn/agent-builder-common';

export type ConversationTemplateResolver = (templateId: string) => ConversationTemplate | undefined;

interface ConversationWithMaybeMetadata {
  template_id?: string;
  metadata?: unknown;
}

/** Converts a domain metadata value to its ES `flattened` storage form. TEXT_ARRAY → string[]; everything else → String(value). */
export const serializeMetadataValue = (
  value: MetadataFieldValue,
  inputType: ConversationTemplateInputType
): SerializedMetadataValue => {
  if (inputType === 'TEXT_ARRAY') {
    const arr = Array.isArray(value) ? value : [String(value)];
    return arr.map(String);
  }
  return String(value);
};

/**
 * Converts a stored metadata value back to its declared JS type.
 * TOGGLE → boolean, NUMBER → number (or raw string if NaN), TEXT_ARRAY → string[], others → unchanged.
 */
export const deserializeMetadataValue = (
  value: SerializedMetadataValue,
  inputType: ConversationTemplateInputType
): MetadataFieldValue => {
  if (inputType === 'TOGGLE') {
    return value === 'true';
  }
  if (inputType === 'NUMBER') {
    const n = Number(value);
    return Number.isNaN(n) ? value : n;
  }
  if (inputType === 'TEXT_ARRAY') {
    return Array.isArray(value) ? value : [value as string];
  }
  return value;
};

/** Deserializes all metadata keys that have a field definition; undeclared keys pass through. */
export const deserializeMetadata = (
  stored: Record<string, SerializedMetadataValue>,
  template: ConversationTemplate
): Record<string, MetadataFieldValue> => {
  const result: Record<string, MetadataFieldValue> = {};
  for (const [key, value] of Object.entries(stored)) {
    const def = template.fields[key];
    result[key] = def ? deserializeMetadataValue(value, def.input_type) : value;
  }
  return result;
};

/** Applies `deserializeMetadata` when a matching template can be resolved. */
export const withDeserializedMetadata = <T extends object>(
  conversation: T & ConversationWithMaybeMetadata,
  resolveTemplate: ConversationTemplateResolver
): T => {
  if (!conversation.template_id || !conversation.metadata) return conversation;

  const template = resolveTemplate(conversation.template_id);
  if (!template) return conversation;

  return {
    ...conversation,
    metadata: deserializeMetadata(
      conversation.metadata as Record<string, SerializedMetadataValue>,
      template
    ),
  } as T;
};

/** Builds serialized metadata defaults from a template definition. */
export const buildMetadataFromTemplate = (
  template: ConversationTemplate
): Record<string, SerializedMetadataValue> =>
  Object.entries(template.fields).reduce<Record<string, SerializedMetadataValue>>(
    (acc, [fieldName, def]) => {
      if (def.default_value !== undefined) {
        acc[fieldName] = serializeMetadataValue(def.default_value, def.input_type);
      }
      return acc;
    },
    {}
  );
