/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { monaco, MonacoMessage } from '@kbn/code-editor';

export interface EditorMessages {
  errors: MonacoMessage[];
  warnings: MonacoMessage[];
}

/**
 * Per-model registry of the latest ES|QL validation messages, keyed by Monaco
 * model URI.
 *
 * Monaco language providers (including the ES|QL code action provider) are
 * registered once per language, but the sandbox renders several ES|QL editors
 * at once (base / alert / recovery / single). The code action provider resolves
 * quick fixes from `deps.getEditorMessages()`; this registry lets each editor's
 * validation hook publish its own messages so the shared provider can pick the
 * right ones for the model it's asked about — the same pattern as
 * `esqlDepsByModelUri` in `@kbn/esql-editor`.
 */
const registry = new Map<string, () => EditorMessages>();

/**
 * Registers a messages resolver for a model URI. Returns a disposer that removes
 * the entry (only if it hasn't already been replaced by a newer registration).
 */
export const registerEditorMessages = (
  modelUri: string,
  getMessages: () => EditorMessages
): (() => void) => {
  registry.set(modelUri, getMessages);
  return () => {
    if (registry.get(modelUri) === getMessages) {
      registry.delete(modelUri);
    }
  };
};

/**
 * Resolver passed to `ESQLLang.getCodeActionProvider`. Returns the model-specific
 * `getEditorMessages` so the provider can match markers to messages and offer
 * quick fixes. Returns `undefined` for models with no registered validation.
 */
export const getModelDependencies = (model: monaco.editor.ITextModel) => {
  const getEditorMessages = registry.get(model.uri.toString());
  return getEditorMessages ? { getEditorMessages } : undefined;
};
