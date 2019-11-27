/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useEffect } from 'react';
import {
  // @ts-ignore
  EuiSuggest,
} from '@elastic/eui';
import { useDebounce } from '../hooks/use_debounce';
import { useLibs } from '../hooks/use_libs';

const DEBOUNCE_SEARCH_MS = 150;

interface Suggestion {
  label: string;
  description: string;
  value: string;
  type: {
    color: string;
    iconType: string;
  };
  start: number;
  end: number;
}

interface Props {
  value: string;
  fieldPrefix: string;
  onChange: (newValue: string) => void;
}

export const SearchBar: FC<Props> = ({ value, fieldPrefix, onChange }) => {
  const { suggestions } = useSuggestions(fieldPrefix, value);

  const onAutocompleteClick = (suggestion: Suggestion) => {
    onChange(
      [value.slice(0, suggestion.start), suggestion.value, value.slice(suggestion.end, -1)].join('')
    );
  };
  const onChangeSearch = (s: string) => {
    onChange(s);
  };

  return (
    <EuiSuggest
      value={value}
      icon={'search'}
      placeholder={'Search'}
      onInputChange={onChangeSearch}
      suggestions={suggestions}
      onItemClick={onAutocompleteClick}
    />
  );
};

function transformSuggestionType(type: string): { iconType: string; color: string } {
  switch (type) {
    case 'field':
      return { iconType: 'kqlField', color: 'tint4' };
    case 'value':
      return { iconType: 'kqlValue', color: 'tint0' };
    case 'conjunction':
      return { iconType: 'kqlSelector', color: 'tint3' };
    case 'operator':
      return { iconType: 'kqlOperand', color: 'tint1' };
    default:
      return { iconType: 'kqlOther', color: 'tint1' };
  }
}

function useSuggestions(fieldPrefix: string, search: string) {
  const { elasticsearch } = useLibs();
  const debouncedSearch = useDebounce(search, DEBOUNCE_SEARCH_MS);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const fetchSuggestions = async () => {
    try {
      const esSuggestions = (
        await elasticsearch.getSuggestions(debouncedSearch, debouncedSearch.length, fieldPrefix)
      ).map(suggestion => ({
        label: suggestion.text,
        description: suggestion.description || '',
        type: transformSuggestionType(suggestion.type),
        start: suggestion.start,
        end: suggestion.end,
        value: suggestion.text,
      }));
      setSuggestions(esSuggestions);
    } catch (err) {
      setSuggestions([]);
    }
  };

  useEffect(() => {
    fetchSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  return {
    suggestions,
  };
}
