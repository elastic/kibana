/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSearchBarOnChangeArgs, Search } from '@elastic/eui';
import { EuiSearchBar } from '@elastic/eui';
import type { Tool as McpTool } from '@kbn/mcp-client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { labels } from '../../../utils/i18n';

export interface McpToolsSearch {
  searchConfig: Search;
  searchQuery: string;
  results: McpTool[];
}

export interface UseMcpToolsSearchOptions {
  tools: readonly McpTool[];
  isDisabled?: boolean;
}

export const useMcpToolsSearch = ({
  tools,
  isDisabled = false,
}: UseMcpToolsSearchOptions): McpToolsSearch => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<McpTool[]>([...tools]);

  useEffect(() => {
    setResults([...tools]);
  }, [tools]);

  const handleChange = useCallback(
    ({ query, queryText, error: searchError }: EuiSearchBarOnChangeArgs) => {
      if (searchError) {
        return;
      }

      const newItems = query
        ? EuiSearchBar.Query.execute(query, tools as McpTool[], {
            defaultFields: ['name', 'description'],
          })
        : [...tools];

      setSearchQuery(queryText);
      setResults(newItems);
    },
    [tools]
  );

  const searchConfig: Search = useMemo(
    () => ({
      onChange: handleChange,
      box: {
        incremental: true,
        placeholder: labels.tools.bulkImportMcp.sourceSection.searchPlaceholder,
        disabled: isDisabled || tools.length === 0,
        'data-test-subj': 'bulkImportMcpToolsSearchInput',
      },
    }),
    [handleChange, isDisabled, tools.length]
  );

  return {
    searchConfig,
    searchQuery,
    results,
  };
};
