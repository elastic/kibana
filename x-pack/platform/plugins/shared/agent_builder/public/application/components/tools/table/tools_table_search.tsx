/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSearchBarOnChangeArgs, EuiSearchBarProps, Search } from '@elastic/eui';
import { EuiSearchBar } from '@elastic/eui';
import type { ToolDefinition } from '@kbn/agent-builder-common';
import { countBy } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useToolsTags } from '../../../hooks/tools/use_tool_tags';
import { useToolsService } from '../../../hooks/tools/use_tools';
import { useQueryState } from '../../../hooks/use_query_state';
import { labels } from '../../../utils/i18n';
import { FilterOptionWithMatchesBadge } from '../../common/filter_option_with_matches_badge';

const toValidSearchQuery = (query: string | null): string => {
  try {
    const queryString = query ?? '';
    EuiSearchBar.Query.parse(queryString);
    return queryString;
  } catch (error) {
    return '';
  }
};

const getToolsTableSearchConfig = ({
  matchesByTag,
  tags,
}: {
  matchesByTag: Record<string, number>;
  tags: string[];
}): EuiSearchBarProps => ({
  box: {
    incremental: true,
    placeholder: labels.tools.searchToolsPlaceholder,
    'data-test-subj': 'agentBuilderToolsSearchInput',
  },
  filters: [
    {
      type: 'field_value_selection',
      field: 'tags',
      name: labels.tools.tagsFilter,
      multiSelect: 'or',
      options: tags.map((tag) => ({
        value: tag,
        name: tag,
        view: <FilterOptionWithMatchesBadge name={tag} matches={matchesByTag[tag] ?? 0} />,
      })),
      autoSortOptions: false,
      searchThreshold: 1,
    },
  ],
});

export interface ToolsTableSearch {
  searchConfig: Search;
  results: ToolDefinition[];
}

export const useToolsTableSearch = (): ToolsTableSearch => {
  const { tools } = useToolsService();
  const { tags } = useToolsTags();
  const [results, setResults] = useState<ToolDefinition[]>(tools);
  const [searchQuery, setSearchQuery] = useQueryState('search', {
    defaultValue: '',
    parse: toValidSearchQuery,
  });

  useEffect(() => {
    setResults(tools);
  }, [tools]);

  const handleChange = useCallback(
    ({ query, queryText, error: searchError }: EuiSearchBarOnChangeArgs) => {
      if (searchError) {
        return;
      }

      const newItems = query
        ? EuiSearchBar.Query.execute(query, tools, {
            defaultFields: ['id', 'description', 'type'],
          })
        : tools;

      setSearchQuery(queryText);
      setResults(newItems);
    },
    [tools, setSearchQuery]
  );

  const matchesByTag = useMemo(() => {
    return countBy(tools.flatMap((tool) => tool.tags));
  }, [tools]);

  const searchConfig: Search = useMemo(
    () => ({
      ...getToolsTableSearchConfig({ matchesByTag, tags }),
      onChange: handleChange,
      query: searchQuery,
    }),
    [handleChange, matchesByTag, tags, searchQuery]
  );
  return {
    searchConfig,
    results,
  };
};
