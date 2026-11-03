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

export const UNSAFE_PATH_SEGMENTS: ReadonlySet<string> = new Set([
  '__proto__',
  'prototype',
  'constructor',
]);

/** Thrown when a template path is unsafe, unknown, or missing an embedded value. */
export class TemplateRenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TemplateRenderError';
  }
}

const EXACT_TEMPLATE = /^\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}$/;
const EMBEDDED_TEMPLATE = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

const resolveTemplatePath = (path: string, context: TemplateContext): unknown => {
  const [root, ...segments] = path.split('.');
  if (root !== 'input' && root !== 'config') {
    throw new TemplateRenderError(
      `Declarative templates may only read from input or config. Received "${path}".`
    );
  }
  let current: unknown = context[root];
  for (const segment of segments) {
    if (UNSAFE_PATH_SEGMENTS.has(segment)) {
      throw new TemplateRenderError(`Unsafe declarative template path segment "${segment}".`);
    }
    if (current === null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
};

const renderString = (value: string, context: TemplateContext): unknown => {
  const exactMatch = value.match(EXACT_TEMPLATE);
  if (exactMatch) {
    return resolveTemplatePath(exactMatch[1], context);
  }
  return value.replace(EMBEDDED_TEMPLATE, (_match, path: string) => {
    const resolved = resolveTemplatePath(path, context);
    if (resolved === undefined) {
      throw new TemplateRenderError(`Declarative template "${path}" did not resolve to a value.`);
    }
    return String(resolved);
  });
};

/** Encodes interpolated URL values so they cannot change path or query structure. */
export const renderUrlTemplate = (
  value: string,
  context: TemplateContext,
  allowBaseUrlPrefix = false
): string =>
  value.replace(EMBEDDED_TEMPLATE, (_match, path: string, offset: number) => {
    const resolved = resolveTemplatePath(path, context);
    if (resolved === undefined || resolved === null) {
      throw new TemplateRenderError(`Declarative template "${path}" did not resolve to a value.`);
    }
    if (
      typeof resolved !== 'string' &&
      typeof resolved !== 'number' &&
      typeof resolved !== 'boolean'
    ) {
      throw new TemplateRenderError(`Declarative URL template "${path}" must resolve to a scalar.`);
    }
    const rendered = String(resolved);
    if (rendered === '.' || rendered === '..') {
      throw new TemplateRenderError(`Declarative URL template "${path}" is a dot path segment.`);
    }
    return allowBaseUrlPrefix && offset === 0 && path === 'config.baseUrl'
      ? rendered
      : encodeURIComponent(rendered);
  });

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
