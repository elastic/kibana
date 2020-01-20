/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { npStart } from 'ui/new_platform';
import { autocomplete, IIndexPattern } from 'src/plugins/data/public';
import { RendererFunction } from '../utils/typed_react';

interface WithKueryAutocompletionLifecycleProps {
  children: RendererFunction<{
    isLoadingSuggestions: boolean;
    loadSuggestions: (expression: string, cursorPosition: number, maxSuggestions?: number) => void;
    suggestions: autocomplete.QuerySuggestion[];
  }>;
  indexPattern: IIndexPattern;
}

interface WithKueryAutocompletionLifecycleState {
  // lacking cancellation support in the autocompletion api,
  // this is used to keep older, slower requests from clobbering newer ones
  currentRequest: {
    expression: string;
    cursorPosition: number;
  } | null;
  suggestions: autocomplete.QuerySuggestion[];
}

export class WithKueryAutocompletion extends React.Component<
  WithKueryAutocompletionLifecycleProps,
  WithKueryAutocompletionLifecycleState
> {
  public readonly state: WithKueryAutocompletionLifecycleState = {
    currentRequest: null,
    suggestions: [],
  };

  public render() {
    const { currentRequest, suggestions } = this.state;

    return this.props.children({
      isLoadingSuggestions: currentRequest !== null,
      loadSuggestions: this.loadSuggestions,
      suggestions,
    });
  }

  private loadSuggestions = async (
    expression: string,
    cursorPosition: number,
    maxSuggestions?: number
  ) => {
    const { indexPattern } = this.props;
    const language = 'kuery';
    const hasQuerySuggestions = npStart.plugins.data.autocomplete.hasQuerySuggestions(language);

    if (!hasQuerySuggestions) {
      return;
    }

    this.setState({
      currentRequest: {
        expression,
        cursorPosition,
      },
      suggestions: [],
    });

    const suggestions =
      (await npStart.plugins.data.autocomplete.getQuerySuggestions({
        language,
        query: expression,
        selectionStart: cursorPosition,
        selectionEnd: cursorPosition,
        indexPatterns: [indexPattern],
        boolFilter: [],
      })) || [];

    this.setState(state =>
      state.currentRequest &&
      state.currentRequest.expression !== expression &&
      state.currentRequest.cursorPosition !== cursorPosition
        ? state // ignore this result, since a newer request is in flight
        : {
            ...state,
            currentRequest: null,
            suggestions: maxSuggestions ? suggestions.slice(0, maxSuggestions) : suggestions,
          }
    );
  };
}
