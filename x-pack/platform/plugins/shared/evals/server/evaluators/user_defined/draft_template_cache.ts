/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Mustache from 'mustache';

/**
 * Mustache parses a template once and keeps the result forever, keyed by the template's own
 * text, in a cache the whole process shares with every other prompt rendered through the
 * inference plugin.
 *
 * That suits a persisted evaluator, which is a bounded set of templates rendered many times.
 * It is pure leak for a draft: `_test` renders a template that is unique per keystroke and
 * never stored, so each run retains roughly 18KB that nothing will ever read again.
 *
 * Refusing to cache only the drafts currently under test leaves the shared cache doing its
 * job for everyone else. Flushing it instead would be cheap per entry but would make every
 * unrelated prompt in the process re-parse, which a caller could trigger at will.
 */
const draftTemplates = new Map<string, number>();

let installed = false;

/**
 * Mustache keys an entry as `template + ':' + tags`, so a draft's entries are the ones
 * opening with its own text.
 */
const isDraftEntry = (cacheKey: string): boolean => {
  for (const template of draftTemplates.keys()) {
    if (cacheKey.startsWith(`${template}:`)) {
      return true;
    }
  }
  return false;
};

/**
 * Wraps the shared template cache so drafts under test are never stored. Called on the first
 * hold rather than at setup, so the hold cannot be defeated by ordering; wrapping once is
 * enough, and the entries already cached are kept because the wrapper delegates to them.
 */
const installDraftAwareTemplateCache = (): void => {
  if (installed) {
    return;
  }
  installed = true;

  const shared = Mustache.templateCache;
  if (!shared) {
    // Caching is already disabled process-wide, so a draft cannot be retained anyway.
    return;
  }

  Mustache.templateCache = {
    get: (cacheKey) => shared.get(cacheKey),
    set: (cacheKey, value) => {
      if (!isDraftEntry(cacheKey)) {
        shared.set(cacheKey, value);
      }
    },
    clear: () => shared.clear(),
  };
};

/**
 * Runs `execute` with `templates` held out of the shared cache. Counted rather than flagged,
 * so concurrent runs of the same draft do not release each other's hold.
 */
export const withUncachedTemplates = async <T>(
  templates: readonly string[],
  execute: () => Promise<T>
): Promise<T> => {
  installDraftAwareTemplateCache();

  for (const template of templates) {
    draftTemplates.set(template, (draftTemplates.get(template) ?? 0) + 1);
  }

  try {
    return await execute();
  } finally {
    for (const template of templates) {
      const held = (draftTemplates.get(template) ?? 1) - 1;
      if (held > 0) {
        draftTemplates.set(template, held);
      } else {
        draftTemplates.delete(template);
      }
    }
  }
};
