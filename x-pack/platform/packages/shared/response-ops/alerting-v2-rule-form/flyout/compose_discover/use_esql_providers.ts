/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { ESQLLang, ESQL_LANG_ID, monaco } from '@kbn/code-editor';
import type { ESQLCallbacks } from '@kbn/esql-types';
import { useEsqlCallbacks } from '../../form/hooks/use_esql_callbacks';
import type { RuleFormServices } from '../../form/contexts/rule_form_context';

// Monaco keybinding rules are global (per language service, not per editor) and
// cannot be un-added, so register them once for the whole page.
let inlineSuggestTabKeybindingsAdded = false;

/**
 * Makes Tab accept the inline suggestion (ghost text) instead of the autocomplete
 * widget when both are visible — mirroring `addTabKeybindingRules` in
 * `@kbn/esql-editor`. Without this, Tab commits the suggestion widget item and the
 * ghost text is ignored.
 */
const addInlineSuggestTabKeybindings = () => {
  if (inlineSuggestTabKeybindingsAdded) {
    return;
  }

  // Unbind the default suggestion-widget accept on Tab while an inline suggestion is showing.
  monaco.editor.addKeybindingRule({
    keybinding: monaco.KeyCode.Tab,
    command: '-acceptSelectedSuggestion',
    when: 'suggestWidgetHasFocusedSuggestion && suggestWidgetVisible && textInputFocus && inlineSuggestionVisible',
  });
  // Bind Tab to commit the inline suggestion when it's visible.
  monaco.editor.addKeybindingRule({
    keybinding: monaco.KeyCode.Tab,
    command: 'editor.action.inlineSuggest.commit',
    when: 'inlineSuggestionVisible && textInputFocus',
  });

  inlineSuggestTabKeybindingsAdded = true;
};

/**
 * Registers ES|QL Monaco language providers (autocomplete, signature help, hover,
 * inline completions, code actions, document highlight) for the lifetime of the
 * component that calls this hook.
 *
 * Providers are registered per-hook-instance rather than via a module-level singleton.
 * This avoids two problems with the previous singleton pattern:
 *
 * 1. React Strict Mode double-invokes effects (mount → unmount → mount). The old
 *    `if (registeredDisposables) return` guard caused the second mount to skip
 *    registration entirely, leaving the editor with no autocomplete.
 *
 * 2. Multiple concurrent instances would share one set of providers, so the first
 *    unmount would dispose providers that the second instance still needed.
 *
 * Callbacks are stored in a ref so they stay current across renders without
 * causing the effect to re-run on every render. The effect only re-runs when
 * the callbacks object reference changes (i.e. when services change).
 */
export const useEsqlAutocomplete = (services: RuleFormServices) => {
  const callbacks = useEsqlCallbacks({
    application: services.application,
    http: services.http,
    search: services.data.search.search,
  });

  // Keep callbacks ref current so providers always use the latest without
  // needing to be re-registered on every render.
  const callbacksRef = useRef<ESQLCallbacks>(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    const stableCallbacks: ESQLCallbacks = {
      getSources: (...args) => callbacksRef.current.getSources?.(...args) ?? [],
      getColumnsFor: (...args) => callbacksRef.current.getColumnsFor?.(...args) ?? [],
      getDatasets: (...args) =>
        callbacksRef.current.getDatasets?.(...args) ?? Promise.resolve({ datasets: [] }),
      getViews: (...args) =>
        callbacksRef.current.getViews?.(...args) ?? Promise.resolve({ views: [] }),
    };

    const disposables: monaco.IDisposable[] = [];

    if (!ESQLLang) {
      return () => {};
    }

    const suggestion = ESQLLang.getSuggestionProvider?.(stableCallbacks);
    if (suggestion) {
      disposables.push(monaco.languages.registerCompletionItemProvider(ESQL_LANG_ID, suggestion));
    }

    const signature = ESQLLang.getSignatureProvider?.(stableCallbacks);
    if (signature) {
      disposables.push(monaco.languages.registerSignatureHelpProvider(ESQL_LANG_ID, signature));
    }

    const hover = ESQLLang.getHoverProvider?.(stableCallbacks);
    if (hover) {
      disposables.push(monaco.languages.registerHoverProvider(ESQL_LANG_ID, hover));
    }

    const inlineCompletions = ESQLLang.getInlineCompletionsProvider?.(stableCallbacks);
    if (inlineCompletions) {
      disposables.push(
        monaco.languages.registerInlineCompletionsProvider(ESQL_LANG_ID, inlineCompletions)
      );
      addInlineSuggestTabKeybindings();
    }

    // Quick fixes only surface once validation markers exist (wired separately);
    // registering here is harmless until then.
    const codeActions = ESQLLang.getCodeActionProvider?.(stableCallbacks);
    if (codeActions) {
      disposables.push(monaco.languages.registerCodeActionProvider(ESQL_LANG_ID, codeActions));
    }

    const documentHighlight = ESQLLang.getDocumentHighlightProvider?.();
    if (documentHighlight) {
      disposables.push(
        monaco.languages.registerDocumentHighlightProvider(ESQL_LANG_ID, documentHighlight)
      );
    }

    return () => {
      disposables.forEach((d) => d.dispose());
    };
    // Empty deps: register once on mount, clean up on unmount.
    // Callbacks stay current via callbacksRef without triggering re-registration.
  }, []);
};
