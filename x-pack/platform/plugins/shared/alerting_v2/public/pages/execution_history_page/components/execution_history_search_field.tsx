/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFieldSearch } from '@elastic/eui';
import useDebounce from 'react-use/lib/useDebounce';
import { MAX_SEARCH_LENGTH } from '@kbn/alerting-v2-schemas';

const SEARCH_DEBOUNCE_MS = 300;

interface ExecutionHistorySearchFieldProps {
  onSearchChange: (search: string) => void;
  placeholder: string;
  ariaLabel: string;
  'data-test-subj': string;
}

export const ExecutionHistorySearchField = ({
  onSearchChange,
  placeholder,
  ariaLabel,
  'data-test-subj': dataTestSubj,
}: ExecutionHistorySearchFieldProps) => {
  const [searchInput, setSearchInput] = useState('');

  useDebounce(
    () => {
      onSearchChange(searchInput);
    },
    SEARCH_DEBOUNCE_MS,
    [onSearchChange, searchInput]
  );

  return (
    <EuiFieldSearch
      compressed
      fullWidth
      maxLength={MAX_SEARCH_LENGTH}
      data-test-subj={dataTestSubj}
      placeholder={placeholder}
      value={searchInput}
      onChange={(e) => setSearchInput(e.target.value)}
      aria-label={ariaLabel}
    />
  );
};
