/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldSearch } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import type { KeyboardEvent } from 'react';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { MAX_KI_SEARCH_QUERY_LENGTH } from '../../../../../common/constants';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../../common/telemetry';

export interface ListKiSearchBoxHandle {
  commitSearch: () => string;
}

interface ListKiSearchBoxProps {
  value: string;
  isLoading?: boolean;
  onSearch: (value: string) => void;
}

export const ListKiSearchBox = forwardRef<ListKiSearchBoxHandle, ListKiSearchBoxProps>(
  ({ value, isLoading = false, onSearch }, ref) => {
    const [queryText, setQueryText] = useState(value);

    useEffect(() => {
      setQueryText(value);
    }, [value]);

    const commitSearch = useCallback(() => {
      const trimmed = queryText.trim();
      onSearch(trimmed);
      return trimmed;
    }, [onSearch, queryText]);

    useImperativeHandle(ref, () => ({ commitSearch }), [commitSearch]);

    const searchPlaceholder = i18n.translate(
      'xpack.contextEngine.aiIndexDetail.listKi.searchPlaceholder',
      {
        defaultMessage: 'Search by title',
      }
    );

    const searchEbtProps = getEbtProps({
      element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageListKiPanel,
      action: CONTEXT_ENGINE_UI_EBT.action.listKi.SEARCH,
    });

    const handleChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const text = event.target.value;
        setQueryText(text);
        if (text === '') {
          onSearch('');
        }
      },
      [onSearch]
    );

    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          commitSearch();
        }
      },
      [commitSearch]
    );

    return (
      <EuiFieldSearch
        compressed
        fullWidth
        incremental={false}
        isClearable
        isLoading={isLoading}
        maxLength={MAX_KI_SEARCH_QUERY_LENGTH}
        placeholder={searchPlaceholder}
        value={queryText}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        data-test-subj="contextListKiSearchBox"
        {...searchEbtProps}
      />
    );
  }
);

ListKiSearchBox.displayName = 'ListKiSearchBox';
