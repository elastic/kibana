/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Mustache from 'mustache';
import { isString, isPlainObject, cloneDeepWith } from 'lodash';
import type { Logger } from '@kbn/core/server';
import { getMustacheLambdas } from './mustache_lambdas';

export type Escape = 'markdown' | 'slack' | 'json' | 'none' | 'html';

// Capture Mustache's built-in HTML escape before any render calls can change it.
// This is the default Mustache.escape: it escapes &, <, >, ", ', /, `, and =.
const mustacheEscapeHtml = Mustache.escape;

type Variables = Record<string, unknown>;

// return a rendered mustache template with no escape given the specified variables and escape
// Individual variable values should be stringified already
export function renderMustacheStringNoEscape(string: string, variables: Variables): string {
  try {
    return Mustache.render(`${string}`, variables);
  } catch (err) {
    // log error; the mustache code does not currently leak variables
    return `error rendering mustache template "${string}": ${err.message}`;
  }
}

// return a rendered mustache template given the specified variables and escape
export function renderMustacheString(
  logger: Logger,
  string: string,
  variables: Variables,
  escape: Escape
): string;
export function renderMustacheString(
  logger: Logger,
  string: string | null,
  variables: Variables,
  escape: Escape
): string | null;
export function renderMustacheString(
  logger: Logger,
  string: string | undefined,
  variables: Variables,
  escape: Escape
): string | undefined;
export function renderMustacheString(
  logger: Logger,
  string: string | null | undefined,
  variables: Variables,
  escape: Escape
): string | null | undefined {
  if (string == null) return string;
  const augmentedVariables = augmentObjectVariables(variables);
  return renderMustacheStringWithAugmentedVariables(logger, string, augmentedVariables, escape);
}

// render a string with variables that have already been augmented with augmentObjectVariables().
function renderMustacheStringWithAugmentedVariables(
  logger: Logger,
  string: string,
  augmentedVariables: Variables,
  escape: Escape
): string {
  const lambdas = getMustacheLambdas(logger);

  const previousMustacheEscape = Mustache.escape;
  Mustache.escape = getEscape(escape);

  try {
    return Mustache.render(`${string}`, { ...lambdas, ...augmentedVariables });
  } catch (err) {
    // log error; the mustache code does not currently leak variables
    return `error rendering mustache template "${string}": ${err.message}`;
  } finally {
    Mustache.escape = previousMustacheEscape;
  }
}

// return a cloned object with all strings rendered as mustache templates
export function renderMustacheObject<Params>(
  logger: Logger,
  params: Params,
  variables: Variables
): Params {
  const augmentedVariables = augmentObjectVariables(variables);
  const result = cloneDeepWith(params, (value: unknown) => {
    if (!isString(value)) return;

    // since we're rendering a JS object, no escaping needed
    return renderMustacheStringWithAugmentedVariables(logger, value, augmentedVariables, 'none');
  });

  // The return type signature for `cloneDeep()` ends up taking the return
  // type signature for the customizer, but rather than pollute the customizer
  // with casts, seemed better to just do it in one place, here.
  return result as unknown as Params;
}

// Return variables as a fresh isolated tree with:
//   - dotted keys expanded into nested objects with deep-merge semantics
//     (order-independent: { 'a.b': 2, a: { x: 1 } } → a = { x:1, b:2 })
//   - toString() attached to every plain object
//   - asJSON() attached to every array
// Replaces the previous three-pass approach (JSON clone → convertDotVariables → addToStringDeep).
function augmentObjectVariables(variables: Variables): Variables {
  return transformNode(variables) as Variables;
}

// Keys that must never be assigned as object properties during dot expansion.
// Assigning to __proto__ via bracket notation changes the receiver's prototype
// chain; traversing it during the segment walk resolves current[__proto__] to
// Object.prototype (because isPlainObject(Object.prototype) === true), enabling
// process-wide prototype pollution. constructor and prototype are included for
// defence-in-depth. This matches the silent-drop behaviour of the previous
// lodash merge() pipeline.
const PROTO_POLLUTION_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function transformNode(value: unknown): unknown {
  if (Array.isArray(value)) {
    const arr: unknown[] = value.map(transformNode);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (arr as any).asJSON = () => JSON.stringify(arr);
    return arr;
  }

  if (isNonNullObject(value)) {
    const obj = makeObj();

    for (const [key, raw] of Object.entries(value)) {
      const transformed = transformNode(raw);

      if (!key.includes('.')) {
        // Skip top-level keys that would mutate the prototype chain.
        if (!PROTO_POLLUTION_KEYS.has(key)) {
          if (isNonNullObject(obj[key]) && isNonNullObject(transformed)) {
            // A prior dotted-key pass already started building this subtree
            // (e.g. 'a.b': 2 was processed before a: { x: 1 }).  Deep-merge
            // the new object into the existing one so neither side's keys are
            // lost, matching lodash merge() semantics regardless of key order.
            deepMergeInto(obj[key] as Record<string, unknown>, transformed);
          } else {
            obj[key] = transformed;
          }
        }
        continue;
      }

      // Inline dotted-path reduction: expand 'a.b.c' → nested objects.
      // If the user's data has an explicit key named 'toString', it overwrites
      // the JSON.stringify function that makeObj() pre-populated, which is the
      // correct precedence (mirrors the Object.hasOwn guard that was in the
      // previous addToStringDeep implementation).
      const parts = key.split('.');
      // Skip dotted keys containing any prototype-polluting segment.
      if (parts.some((part) => PROTO_POLLUTION_KEYS.has(part))) {
        continue;
      }
      let current = obj;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!isNonNullObject(current[part])) current[part] = makeObj();
        current = current[part] as Record<string, unknown>;
      }
      current[parts[parts.length - 1]] = transformed;
    }

    return obj;
  }

  // Scalar, null, undefined: copy by value (no allocation needed).
  return value;
}

// Deep-merges every own-enumerable, non-function entry from `source` into
// `target` in place.  Recurses into nested plain-object pairs; all other
// values are assigned (source wins, matching lodash merge semantics).
// Function-valued entries (e.g. the toString closure added by makeObj) are
// intentionally skipped so the target's own toString closure is preserved.
function deepMergeInto(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const [key, val] of Object.entries(source)) {
    if (PROTO_POLLUTION_KEYS.has(key)) continue;
    if (typeof val === 'function') continue;
    if (isNonNullObject(target[key]) && isNonNullObject(val)) {
      deepMergeInto(target[key] as Record<string, unknown>, val as Record<string, unknown>);
    } else {
      target[key] = val;
    }
  }
}

// Creates a fresh plain object pre-populated with a toString() that serialises
// the object to JSON. Using a closure over `obj` means JSON.stringify sees all
// keys added after construction, and the toString function itself is ignored by
// JSON.stringify (functions are not serialised), so it won't appear in output.
function makeObj(): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  obj.toString = () => JSON.stringify(obj);
  return obj;
}

function isNonNullObject(object: unknown): object is Record<string, unknown> {
  if (object == null) return false;
  if (typeof object !== 'object') return false;
  if (!isPlainObject(object)) return false;
  return true;
}

function getEscape(escape: Escape): (value: unknown) => string {
  if (escape === 'markdown') return escapeMarkdown;
  if (escape === 'slack') return escapeSlack;
  if (escape === 'json') return escapeJSON;
  if (escape === 'html') return mustacheEscapeHtml;
  return escapeNone;
}

function escapeNone(value: unknown): string {
  if (value == null) return '';
  return `${value}`;
}

// replace with JSON stringified version, removing leading and trailing double quote
function escapeJSON(value: unknown): string {
  if (value == null) return '';

  const quoted = JSON.stringify(`${value}`);
  // quoted will always be a string with double quotes, but we don't want the double quotes
  return quoted.substr(1, quoted.length - 2);
}

// see: https://api.slack.com/reference/surfaces/formatting
// but in practice, a bit more needs to be escaped, in drastic ways
function escapeSlack(value: unknown): string {
  if (value == null) return '';

  const valueString = `${value}`;
  // if the value contains * or _ and is not a url, escape the whole thing with back tics
  if (valueString.includes('_') || valueString.includes('*')) {
    try {
      new URL(valueString);
    } catch (e) {
      // replace unescapable back tics with single quote
      return '`' + valueString.replace(/`/g, `'`) + '`';
    }
  }

  // otherwise, do "standard" escaping
  return (
    valueString
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // this isn't really standard escaping, but escaping back tics is problematic
      .replace(/`/g, `'`)
  );
}

// see: https://www.markdownguide.org/basic-syntax/#characters-you-can-escape
function escapeMarkdown(value: unknown): string {
  if (value == null) return '';

  return `${value}`
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/`/g, '\\`')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/#/g, '\\#')
    .replace(/\+/g, '\\+')
    .replace(/-/g, '\\-')
    .replace(/\./g, '\\.')
    .replace(/!/g, '\\!');
}
