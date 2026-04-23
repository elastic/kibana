/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

/**
 * Narrow shape for Monaco editor access in `page.evaluate`. Omit conflicts with
 * the `Window.MonacoEnvironment` from monaco-editor typings.
 */
export type WindowWithMonaco = Omit<Window, 'MonacoEnvironment'> & {
  MonacoEnvironment?: {
    monaco?: {
      editor: {
        getModels: () => Array<{
          setValue: (value: string) => void;
          getValue: () => string;
        }>;
      };
    };
  };
};

/**
 * Return the concatenated text content of every Monaco model on the page.
 * Used by specs/page-objects that need to assert on editor state without
 * reaching into Monaco internals from multiple places.
 */
export async function getMonacoEditorText(page: ScoutPage): Promise<string> {
  return page.evaluate(() => {
    const w = window as unknown as WindowWithMonaco;
    const models = w.MonacoEnvironment?.monaco?.editor.getModels() ?? [];

    return models.map((m) => m.getValue()).join('\n');
  });
}

/**
 * Wait until at least one Monaco model on the page contains `expected`.
 * When `expected === ''`, waits for every model to be empty instead. Default
 * timeout matches the per-call budgets in the osquery page-object call sites.
 */
export async function waitForMonacoContains(
  page: ScoutPage,
  expected: string,
  { timeoutMs = 15_000 }: { timeoutMs?: number } = {}
): Promise<void> {
  await page.waitForFunction(
    (needle: string) => {
      const w = window as unknown as WindowWithMonaco;
      const models = w.MonacoEnvironment?.monaco?.editor.getModels() ?? [];
      const text = models.map((m) => m.getValue()).join('\n');

      if (needle === '') return text.trim() === '';

      return text.includes(needle);
    },
    expected,
    { timeout: timeoutMs }
  );
}

/**
 * Wait until at least one Monaco model on the page has non-empty content.
 * Used after dropdown/saved-query populate flows where the caller doesn't
 * know the exact query body but needs to gate on the editor being populated.
 */
export async function waitForMonacoNonEmpty(
  page: ScoutPage,
  { timeoutMs = 15_000 }: { timeoutMs?: number } = {}
): Promise<void> {
  await page.waitForFunction(
    () => {
      const w = window as unknown as WindowWithMonaco;
      const models = w.MonacoEnvironment?.monaco?.editor.getModels() ?? [];

      return models.some((m) => m.getValue().trim().length > 0);
    },
    undefined,
    { timeout: timeoutMs }
  );
}

/**
 * Replace the contents of every Monaco model on the page with `value`.
 * Safer than keyboard-driven clear-and-type for long strings because it
 * bypasses the 500 ms onChange debounce that drives RHF validation.
 */
export async function setMonacoValue(page: ScoutPage, value: string): Promise<void> {
  await page.evaluate((newValue: string) => {
    const w = window as unknown as WindowWithMonaco;
    const editor = w.MonacoEnvironment?.monaco?.editor;
    if (!editor) return;
    for (const model of editor.getModels()) {
      model.setValue(newValue);
    }
  }, value);
}
