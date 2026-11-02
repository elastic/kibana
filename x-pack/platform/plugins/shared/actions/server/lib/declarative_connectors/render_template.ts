/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface TemplateContext {
  input: Record<string, unknown>;
  config: Record<string, unknown>;
}

const EXACT_TEMPLATE = /^\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}$/;
const EMBEDDED_TEMPLATE = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

const readPath = (root: unknown, path: string): unknown => {
  if (!path) {
    return root;
  }
  let current = root;
  for (const segment of path.split('.')) {
    if (current === null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
};

const resolveTemplatePath = (path: string, context: TemplateContext): unknown => {
  const [root, ...segments] = path.split('.');
  if (root !== 'input' && root !== 'config') {
    return undefined;
  }
  return readPath(context[root], segments.join('.'));
};

const renderString = (value: string, context: TemplateContext): unknown => {
  const exactMatch = value.match(EXACT_TEMPLATE);
  if (exactMatch) {
    return resolveTemplatePath(exactMatch[1], context);
  }
  return value.replace(EMBEDDED_TEMPLATE, (_match, path: string) =>
    String(resolveTemplatePath(path, context))
  );
};

/** Renders `{{ input.x }}` and `{{ config.x }}` templates. Exact templates keep the raw value. */
export const renderTemplateValue = (value: unknown, context: TemplateContext): unknown => {
  if (typeof value === 'string') {
    return renderString(value, context);
  }
  if (Array.isArray(value)) {
    return value.map((item) => renderTemplateValue(item, context));
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, nested]) => [key, renderTemplateValue(nested, context)] as const)
        .filter(([, nested]) => nested !== undefined)
    );
  }
  return value;
};
