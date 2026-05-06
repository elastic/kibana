/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0"; you may not use this file except in compliance with the "Elastic License
 * 2.0".
 */

export interface FormFieldDescriptor {
  path: string;
  type:
    | 'toggle'
    | 'select'
    | 'number'
    | 'range'
    | 'text'
    | 'color'
    | 'buttonGroup'
    | 'section'
    | 'unknown';
  label: string;
  description?: string;
  defaultValue?: unknown;
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  required?: boolean;
  children?: FormFieldDescriptor[];
}

interface WalkOptions {
  pathPrefix?: string;
  excludePaths?: string[];
}

function extractMeta(desc: Record<string, unknown>): {
  title?: string;
  description?: string;
} {
  let title: string | undefined;
  let description: string | undefined;

  // Description is set via Joi's .description() — appears at desc.flags.description or desc.description
  const flags = desc.flags as Record<string, unknown> | undefined;
  description =
    (flags?.description as string | undefined) ?? (desc.description as string | undefined);

  // Title is set via Joi's .meta() — appears in desc.metas array
  const metas = desc.metas as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(metas)) {
    for (const m of metas) {
      if (m.title) title = m.title as string;
      if (!description && m.description) description = m.description as string;
    }
  }

  return { title, description };
}

function extractAllowedValues(
  desc: Record<string, unknown>
): Array<{ value: string; label: string }> | undefined {
  const allow = desc.allow as unknown[] | undefined;
  if (!Array.isArray(allow) || allow.length === 0) return undefined;
  const stringVals = allow.filter((v): v is string => typeof v === 'string');
  if (stringVals.length === 0) return undefined;
  return stringVals.map((v) => ({ value: v, label: v }));
}

function extractNumberConstraints(desc: Record<string, unknown>): { min?: number; max?: number } {
  const rules = desc.rules as Array<{ name: string; args?: Record<string, number> }> | undefined;
  if (!Array.isArray(rules)) return {};
  const result: { min?: number; max?: number } = {};
  for (const rule of rules) {
    if (rule.name === 'min' && rule.args) {
      result.min = rule.args.limit;
    }
    if (rule.name === 'max' && rule.args) {
      result.max = rule.args.limit;
    }
  }
  return result;
}

function collectAlternativesAllows(
  matches: Array<{ schema: Record<string, unknown> }>
): string[] | undefined {
  const values: string[] = [];
  for (const match of matches) {
    const s = match.schema;
    if (s.type === 'any' && Array.isArray(s.allow) && s.allow.length === 1) {
      const val = s.allow[0];
      if (typeof val === 'string') {
        values.push(val);
        continue;
      }
    }
    return undefined;
  }
  return values.length > 0 ? values : undefined;
}

function walkDescription(
  desc: Record<string, unknown>,
  key: string,
  currentPath: string,
  excludePaths: Set<string>
): FormFieldDescriptor | null {
  if (excludePaths.has(currentPath)) return null;

  const meta = extractMeta(desc);
  const label = meta.title ?? key;
  const flags = desc.flags as Record<string, unknown> | undefined;
  const defaultValue = flags?.default;
  const presence = flags?.presence as string | undefined;
  const required = presence === 'required';

  const joiType = desc.type as string;

  if (joiType === 'boolean') {
    return {
      path: currentPath,
      type: 'toggle',
      label,
      description: meta.description,
      defaultValue,
      required,
    };
  }

  if (joiType === 'number') {
    const { min, max } = extractNumberConstraints(desc);
    return {
      path: currentPath,
      type: 'number',
      label,
      description: meta.description,
      defaultValue,
      min,
      max,
      required,
    };
  }

  if (joiType === 'string') {
    const options = extractAllowedValues(desc);
    if (options) {
      return {
        path: currentPath,
        type: 'select',
        label,
        description: meta.description,
        defaultValue,
        options,
        required,
      };
    }
    return {
      path: currentPath,
      type: 'text',
      label,
      description: meta.description,
      defaultValue,
      required,
    };
  }

  if (joiType === 'object') {
    const keys = desc.keys as Record<string, Record<string, unknown>> | undefined;
    const children: FormFieldDescriptor[] = [];
    if (keys) {
      for (const [childKey, childDesc] of Object.entries(keys)) {
        const childPath = currentPath ? `${currentPath}.${childKey}` : childKey;
        const child = walkDescription(childDesc, childKey, childPath, excludePaths);
        if (child) children.push(child);
      }
    }
    return {
      path: currentPath,
      type: 'section',
      label,
      description: meta.description,
      required,
      children: children.length > 0 ? children : undefined,
    };
  }

  if (joiType === 'alternatives') {
    const matches = desc.matches as Array<{ schema: Record<string, unknown> }> | undefined;
    if (Array.isArray(matches)) {
      const stringValues = collectAlternativesAllows(matches);
      if (stringValues) {
        return {
          path: currentPath,
          type: 'select',
          label,
          description: meta.description,
          defaultValue,
          options: stringValues.map((v) => ({ value: v, label: v })),
          required,
        };
      }
    }
    return {
      path: currentPath,
      type: 'unknown',
      label,
      description: meta.description,
      required,
    };
  }

  return {
    path: currentPath,
    type: 'unknown',
    label,
    description: meta.description,
    required,
  };
}

/**
 * Walk a pre-computed Joi schema description (from server endpoint)
 * and produce FormFieldDescriptor[].
 */
export function walkSchemaDescription(
  description: Record<string, unknown>,
  options?: WalkOptions
): FormFieldDescriptor[] {
  const prefix = options?.pathPrefix ?? '';
  const excludePaths = new Set(options?.excludePaths ?? []);

  const keys = description.keys as Record<string, Record<string, unknown>> | undefined;
  if (!keys) return [];

  const results: FormFieldDescriptor[] = [];
  for (const [key, childDesc] of Object.entries(keys)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (excludePaths.has(path)) continue;
    const result = walkDescription(childDesc, key, path, excludePaths);
    if (result) results.push(result);
  }
  return results;
}
