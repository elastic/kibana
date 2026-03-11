/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldSearch } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import * as i18n from '../../templates/translations';

interface TemplatesSearchProps {
  search: string;
  onSearchChange: (search: string) => void;
}

const TemplatesSearchComponent: React.FC<TemplatesSearchProps> = ({ search, onSearchChange }) => {
  const [searchValue, setSearchValue] = useState(search);

  const onSearch = useCallback(
    (newSearch: string) => {
      const trimmedSearch = newSearch.trim();
      setSearchValue(trimmedSearch);
      onSearchChange(trimmedSearch);
    },
    [onSearchChange]
  );

  return (
    <EuiFieldSearch
      aria-label={i18n.SEARCH_TEMPLATES}
      data-test-subj="templates-search"
      fullWidth
      incremental={false}
      placeholder={i18n.SEARCH_TEMPLATES_PLACEHOLDER}
      onChange={(e) => setSearchValue(e.target.value)}
      onSearch={onSearch}
      value={searchValue}
    />
  );
};

TemplatesSearchComponent.displayName = 'TemplatesSearchComponent';

export const TemplatesSearch = React.memo(TemplatesSearchComponent);
