/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { uniqueId } from 'lodash';
import { AutocompleteSuggestion } from 'ui/autocomplete_providers';
// @ts-ignore
import { Typeahead } from './Typeahead';

type BoolFilter = any[];

interface Props {
  initialValue?: string;
  onSelect: (inputValue: string) => void;
  getSuggestions: (
    inputValue: string,
    selectionStart: number,
    boolFilter?: BoolFilter
  ) => AutocompleteSuggestion[];
  disabled: boolean;
  boolFilter?: any[];
}

interface State {
  suggestions: AutocompleteSuggestion[];
  isLoadingSuggestions: boolean;
}

export function KueryBar({
  onSelect,
  getSuggestions,
  initialValue,
  boolFilter = [],
  disabled = false,
}: Props) {
  const [state, setState] = useState<State>({
    suggestions: [],
    isLoadingSuggestions: false,
  });

  let lastRequestCheck;

  async function onChange(inputValue: string, selectionStart: number) {
    setState({ ...state, suggestions: [], isLoadingSuggestions: true });

    const currentRequest = uniqueId();
    lastRequestCheck = currentRequest;

    const suggestions = await getSuggestions(inputValue, selectionStart, boolFilter);

    if (currentRequest !== lastRequestCheck) {
      return;
    }

    setState({ ...state, suggestions, isLoadingSuggestions: false });
  }

  return (
    <Typeahead
      disabled={disabled}
      isLoading={state.isLoadingSuggestions}
      initialValue={initialValue}
      onChange={onChange}
      onSubmit={onSelect}
      suggestions={state.suggestions}
    />
  );
}
