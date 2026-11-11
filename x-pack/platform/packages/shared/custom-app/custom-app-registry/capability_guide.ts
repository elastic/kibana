/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CapabilityManifest } from './define_capability';

type JsonSchema = Record<string, unknown>;

const isObject = (value: unknown): value is JsonSchema =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The values a setting can have, when it is a choice, from the schema or from one side of a union. */
const getChoices = (schema: JsonSchema): unknown[] | undefined => {
  if (Array.isArray(schema.enum)) return schema.enum;
  const members = [...(Array.isArray(schema.anyOf) ? schema.anyOf : [])].filter(isObject);
  return members.map(getChoices).find((choices) => choices !== undefined);
};

/**
 * The line that tells an LLM about a capability, made from its manifest: the settings, which are
 * optional and which are a choice, then what it is and when to use it.
 */
export const describeCapability = <Id extends string, Shape extends z.ZodRawShape>(
  manifest: CapabilityManifest<Id, Shape>
): string => {
  const schema = z.toJSONSchema(manifest.props, {
    io: 'input',
    unrepresentable: 'any',
  }) as JsonSchema;
  const required = new Set(Array.isArray(schema.required) ? (schema.required as string[]) : []);
  const settings = Object.entries((schema.properties ?? {}) as Record<string, JsonSchema>)
    .map(([name, setting]) => {
      const choices = getChoices(setting);
      const label = required.has(name) ? name : `${name}?`;
      return choices
        ? `${label}: ${choices.map((choice) => JSON.stringify(choice)).join(' | ')}`
        : label;
    })
    .concat(manifest.container ? ['children'] : [])
    .join(', ');
  return `- ${manifest.id} { ${settings} }: ${manifest.doc.summary} ${manifest.doc.whenToUse}`;
};
