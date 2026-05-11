/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { ESQLLang, ESQL_LANG_ID, monaco } from '@kbn/monaco';
import type { ESQLCallbacks } from '@kbn/esql-types';
import { useEsqlCallbacks } from '../../form/hooks/use_esql_callbacks';
import type { RuleFormServices } from '../../form/contexts/rule_form_context';

let registeredDisposables: monaco.IDisposable[] | null = null;

function registerProviders(callbacks: ESQLCallbacks) {
  if (registeredDisposables) return;
  const disposables: monaco.IDisposable[] = [];

  const suggestion = ESQLLang.getSuggestionProvider?.(callbacks);
  if (suggestion) {
    disposables.push(
      monaco.languages.registerCompletionItemProvider(ESQL_LANG_ID, suggestion)
    );
  }

  const signature = ESQLLang.getSignatureProvider?.(callbacks);
  if (signature) {
    disposables.push(
      monaco.languages.registerSignatureHelpProvider(ESQL_LANG_ID, signature)
    );
  }

  const hover = ESQLLang.getHoverProvider?.(callbacks);
  if (hover) {
    disposables.push(monaco.languages.registerHoverProvider(ESQL_LANG_ID, hover));
  }

  registeredDisposables = disposables;
}

export const useEsqlAutocomplete = (services: RuleFormServices) => {
  const callbacks = useEsqlCallbacks({
    application: services.application,
    http: services.http,
    search: services.data.search.search,
  });

  useEffect(() => {
    registerProviders(callbacks);
    return () => {
      if (registeredDisposables) {
        registeredDisposables.forEach((d) => d.dispose());
        registeredDisposables = null;
      }
    };
  }, [callbacks]);
};
