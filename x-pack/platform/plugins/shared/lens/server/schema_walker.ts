/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldDescriptor, UISchemaEntry } from './ui_schemas';

const humanizeLabel = (raw: string): string => {
  if (raw.includes(' ')) return raw;
  return raw
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^\w/, (c) => c.toUpperCase());
};

export interface JoiDescription {
  type?: string;
  keys?: Record<string, JoiDescription>;
  flags?: { default?: unknown; description?: string; presence?: string };
  metas?: Array<Record<string, unknown>>;
  description?: string;
  allow?: unknown[];
  rules?: Array<{ name: string; args?: Record<string, number> }>;
  matches?: Array<{ schema: JoiDescription }>;
}

function extractMeta(desc: JoiDescription): { title?: string; description?: string } {
  let title: string | undefined;
  let description: string | undefined;

  description = desc.flags?.description ?? desc.description;

  if (Array.isArray(desc.metas)) {
    for (const m of desc.metas) {
      if (m.title) title = m.title as string;
      if (!description && m.description) description = m.description as string;
    }
  }

  return { title, description };
}

function extractAllowedValues(
  desc: JoiDescription
): Array<{ value: string; label: string }> | undefined {
  const allow = desc.allow;
  if (!Array.isArray(allow) || allow.length === 0) return undefined;
  const stringVals = allow.filter((v): v is string => typeof v === 'string');
  if (stringVals.length === 0) return undefined;
  return stringVals.map((v) => ({ value: v, label: v }));
}

function extractNumberConstraints(desc: JoiDescription): { min?: number; max?: number } {
  const rules = desc.rules;
  if (!Array.isArray(rules)) return {};
  const result: { min?: number; max?: number } = {};
  for (const rule of rules) {
    if (rule.name === 'min' && rule.args) result.min = rule.args.limit;
    if (rule.name === 'max' && rule.args) result.max = rule.args.limit;
  }
  return result;
}

function collectAlternativesAllows(
  matches: Array<{ schema: JoiDescription }>
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

/**
 * Resolve a dot-path in a Joi description tree.
 * Returns the nested description node, or undefined if not found.
 */
function resolveDescriptionPath(
  root: JoiDescription,
  path: string
): { desc: JoiDescription; key: string } | undefined {
  const parts = path.split('.');
  let current = root;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    // Handle `maybe` wrapping: if the current node is alternatives with an object match, unwrap
    const unwrapped = unwrapMaybe(current);
    if (!unwrapped.keys?.[part]) return undefined;
    current = unwrapped.keys[part];
  }

  const lastKey = parts[parts.length - 1];
  const unwrappedCurrent = unwrapMaybe(current);
  if (!unwrappedCurrent.keys?.[lastKey]) return undefined;

  return { desc: unwrappedCurrent.keys[lastKey], key: lastKey };
}

/**
 * Unwrap schema.maybe() — in Joi describe() output, `maybe(x)` becomes
 * an alternatives with matches containing the inner schema and `any.allow(undefined)`.
 * We look for the non-any match.
 */
function unwrapMaybe(desc: JoiDescription): JoiDescription {
  if (desc.type === 'alternatives' && Array.isArray(desc.matches)) {
    for (const match of desc.matches) {
      if (match.schema.type !== 'any') {
        return match.schema;
      }
    }
  }
  return desc;
}

/**
 * Convert a single Joi description node into a FieldDescriptor.
 */
function descToField(desc: JoiDescription, key: string, path: string): FieldDescriptor {
  const unwrapped = unwrapMaybe(desc);
  const meta = extractMeta(unwrapped);
  const label = meta.title ?? humanizeLabel(key);
  const flags = unwrapped.flags;
  const defaultValue = flags?.default;
  const required = flags?.presence === 'required';
  const joiType = unwrapped.type ?? 'unknown';

  if (joiType === 'boolean') {
    return { path, type: 'toggle', label, description: meta.description, defaultValue, required };
  }

  if (joiType === 'number') {
    const { min, max } = extractNumberConstraints(unwrapped);
    return {
      path,
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
    const options = extractAllowedValues(unwrapped);
    if (options) {
      return {
        path,
        type: 'select',
        label,
        description: meta.description,
        defaultValue,
        options,
        required,
      };
    }
    return { path, type: 'text', label, description: meta.description, defaultValue, required };
  }

  if (joiType === 'object') {
    const children: FieldDescriptor[] = [];
    if (unwrapped.keys) {
      for (const [childKey, childDesc] of Object.entries(unwrapped.keys)) {
        children.push(descToField(childDesc, childKey, `${path}.${childKey}`));
      }
    }
    return {
      path,
      type: 'section',
      label,
      description: meta.description,
      required,
      children: children.length > 0 ? children : undefined,
    };
  }

  if (joiType === 'alternatives') {
    if (Array.isArray(unwrapped.matches)) {
      const stringValues = collectAlternativesAllows(unwrapped.matches);
      if (stringValues) {
        return {
          path,
          type: 'select',
          label,
          description: meta.description,
          defaultValue,
          options: stringValues.map((v) => ({ value: v, label: v })),
          required,
        };
      }
    }
    return { path, type: 'alternatives', label, description: meta.description, required };
  }

  return { path, type: 'unknown', label, description: meta.description, required };
}

/**
 * Build a flat, ready-to-render field list by:
 * 1. Walking each UI schema entry's path in the Joi description
 * 2. Converting the matched node into a FieldDescriptor
 * 3. Applying UI schema overrides (label, widget, props, tooltip, description)
 *
 * Only paths listed in the UI schema appear — it acts as an allowlist.
 */
export function buildFieldDescriptors(
  description: JoiDescription,
  uiSchema: UISchemaEntry[]
): FieldDescriptor[] {
  const fields: FieldDescriptor[] = [];

  for (const entry of uiSchema) {
    const resolved = resolveDescriptionPath(description, entry.path);
    if (!resolved) continue;

    const field = descToField(resolved.desc, resolved.key, entry.path);

    // Apply UI schema overrides
    field.label = entry.label;
    if (entry.widget) field.widget = entry.widget;
    if (entry.props) field.props = entry.props;
    if (entry.tooltip) field.tooltip = entry.tooltip;
    if (entry.description) field.description = entry.description;

    // Suppress description when it's redundant with the label
    if (field.description) {
      field.description = cleanDescription(field.description, field.label);
    }

    fields.push(field);
  }

  return fields;
}

/**
 * Clean up description text:
 * - Remove if it's essentially the same as the label
 * - Strip backtick code artifacts (`true`, `false`, etc.)
 * - Remove "When `true`," prefixes since the toggle makes it obvious
 */
function cleanDescription(description: string, label: string): string | undefined {
  // Strip backtick code markers
  let cleaned = description.replace(/`/g, '');

  // Remove trailing period for comparison
  const descNorm = cleaned
    .toLowerCase()
    .replace(/\.\s*$/, '')
    .trim();
  const labelNorm = label
    .toLowerCase()
    .replace(/\.\s*$/, '')
    .trim();

  // Suppress if description matches label
  if (descNorm === labelNorm) return undefined;

  // Suppress if description is just "<label>." with minor variation
  if (descNorm.length <= labelNorm.length + 5 && descNorm.startsWith(labelNorm)) return undefined;

  // Clean up "When `true`, ..." → just the action part
  cleaned = cleaned.replace(/^When true,\s*/i, '');

  // Clean up "Accepted values: ..." boilerplate
  cleaned = cleaned.replace(/\s*Accepted values:.*?\./g, '');

  // Clean up "Defaults to ..." boilerplate
  cleaned = cleaned.replace(/\s*Defaults to .*?\.?$/g, '');

  // Capitalize first letter after cleanup
  cleaned = cleaned.replace(/^\w/, (c) => c.toUpperCase()).trim();

  // If nothing meaningful left, suppress
  if (cleaned.length < 5) return undefined;

  return cleaned;
}
