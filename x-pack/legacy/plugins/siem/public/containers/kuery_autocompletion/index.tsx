/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { StaticIndexPattern } from 'ui/index_patterns';
import { AutocompleteSuggestion } from '../../../../../../../src/plugins/data/public';
import { useKibanaPlugins } from '../../lib/compose/kibana_plugins';

type RendererResult = React.ReactElement<JSX.Element> | null;
type RendererFunction<RenderArgs, Result = RendererResult> = (args: RenderArgs) => Result;

interface KueryAutocompletionLifecycleProps {
  children: RendererFunction<{
    isLoadingSuggestions: boolean;
    loadSuggestions: (expression: string, cursorPosition: number, maxSuggestions?: number) => void;
    suggestions: AutocompleteSuggestion[];
  }>;
  indexPattern: StaticIndexPattern;
}

interface KueryAutocompletionCurrentRequest {
  expression: string;
  cursorPosition: number;
}

export const KueryAutocompletion = React.memo<KueryAutocompletionLifecycleProps>(
  ({ children, indexPattern }) => {
    const [currentRequest, setCurrentRequest] = useState<KueryAutocompletionCurrentRequest | null>(
      null
    );
    const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
    const plugins = useKibanaPlugins();
    const loadSuggestions = async (
      expression: string,
      cursorPosition: number,
      maxSuggestions?: number
    ) => {
      const autocompletionProvider = plugins.data.autocomplete.getProvider('kuery');
      const config = {
        get: () => true,
      };
      if (!autocompletionProvider) {
        return;
      }

      const getSuggestions = autocompletionProvider({
        config,
        indexPatterns: [indexPattern],
        boolFilter: [],
      });
      const futureRequest = {
        expression,
        cursorPosition,
      };
      setCurrentRequest({
        expression,
        cursorPosition,
      });
      setSuggestions([]);
      const newSuggestions = await getSuggestions({
        query: expression,
        selectionStart: cursorPosition,
        selectionEnd: cursorPosition,
      });
      if (
        futureRequest &&
        futureRequest.expression !== (currentRequest && currentRequest.expression) &&
        futureRequest.cursorPosition !== (currentRequest && currentRequest.cursorPosition)
      ) {
        setCurrentRequest(null);
        setSuggestions(maxSuggestions ? newSuggestions.slice(0, maxSuggestions) : newSuggestions);
      }
    };

    return children({
      isLoadingSuggestions: currentRequest !== null,
      loadSuggestions,
      suggestions,
    });
  }
);

KueryAutocompletion.displayName = 'KueryAutocompletion';
