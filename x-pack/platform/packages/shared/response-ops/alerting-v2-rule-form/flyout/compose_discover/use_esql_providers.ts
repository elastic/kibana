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

/**
 * Registers ES|QL Monaco language providers (autocomplete, signature help, hover)
 * for the lifetime of the component that calls this hook.
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
    };

    const disposables: monaco.IDisposable[] = [];

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

    return () => {
      disposables.forEach((d) => d.dispose());
    };
    // Empty deps: register once on mount, clean up on unmount.
    // Callbacks stay current via callbacksRef without triggering re-registration.
  }, []);
};
