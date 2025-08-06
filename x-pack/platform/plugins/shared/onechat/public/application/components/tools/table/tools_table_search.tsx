/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSearchBar, EuiSearchBarOnChangeArgs, EuiSearchBarProps, Search } from '@elastic/eui';
import { ToolDefinitionWithSchema, ToolType } from '@kbn/onechat-common';
import { countBy } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useToolsPreferences } from '../../../context/tools_preferences_provider';
import { useToolTags } from '../../../hooks/tools/use_tool_tags';
import { useToasts } from '../../../hooks/use_toasts';
import { labels } from '../../../utils/i18n';
import { ToolFilterOption } from './tools_table_filter_option';
import { useOnechatTools } from '../../../hooks/tools/use_tools';

const getToolsTableSearchConfig = ({
  includeSystemTools,
  matchesByType,
  matchesByTag,
  tags,
}: {
  includeSystemTools: boolean;
  matchesByType: Record<ToolType, number>;
  matchesByTag: Record<string, number>;
  tags: string[];
}): EuiSearchBarProps => ({
  box: {
    incremental: true,
    placeholder: labels.tools.searchToolsPlaceholder,
  },
  filters: [
    {
      type: 'field_value_selection',
      field: 'type',
      name: labels.tools.typeFilter,
      multiSelect: false,
      options: [
        {
          value: ToolType.esql,
          name: labels.tools.esqlLabel,
          view: (
            <ToolFilterOption
              name={labels.tools.esqlLabel}
              matches={matchesByType[ToolType.esql] ?? 0}
            />
          ),
        },
        ...(includeSystemTools
          ? [
              {
                value: ToolType.builtin,
                name: labels.tools.builtinLabel,
                view: (
                  <ToolFilterOption
                    name={labels.tools.builtinLabel}
                    matches={matchesByType[ToolType.builtin] ?? 0}
                  />
                ),
              },
            ]
          : []),
      ],
    },
    {
      type: 'field_value_selection',
      field: 'tags',
      name: labels.tools.tagsFilter,
      multiSelect: 'or',
      options: tags.map((tag) => ({
        value: tag,
        name: tag,
        view: <ToolFilterOption name={tag} matches={matchesByTag[tag] ?? 0} />,
      })),
      searchThreshold: 1,
    },
  ],
});

export interface ToolsTableSearch {
  searchConfig: Search;
  results: ToolDefinitionWithSchema[];
}

export const useToolsTableSearch = (): ToolsTableSearch => {
  const { addErrorToast } = useToasts();
  const { includeSystemTools } = useToolsPreferences();
  const { tools } = useOnechatTools({ includeSystemTools });
  const { tags } = useToolTags({ includeSystemTools });
  const [results, setResults] = useState<ToolDefinitionWithSchema[]>(tools);

  useEffect(() => {
    setResults(tools);
  }, [tools]);

  const handleChange = useCallback(
    ({ query, error: searchError }: EuiSearchBarOnChangeArgs) => {
      if (searchError) {
        addErrorToast({
          title: labels.tools.searchToolsErrorToast,
          text: searchError.message,
        });
        return;
      }

      const newItems = query
        ? EuiSearchBar.Query.execute(query, tools, {
            defaultFields: ['id', 'description', 'type'],
          })
        : tools;

      setResults(newItems);
    },
    [tools, addErrorToast]
  );

  const matchesByType = useMemo(() => {
    return countBy(tools, 'type') as Record<ToolType, number>;
  }, [tools]);

  const matchesByTag = useMemo(() => {
    return countBy(tools, 'tags');
  }, [tools]);

  const searchConfig = useMemo(
    () => ({
      ...getToolsTableSearchConfig({ includeSystemTools, matchesByType, matchesByTag, tags }),
      onChange: handleChange,
    }),
    [includeSystemTools, handleChange, matchesByType, matchesByTag, tags]
  );
  return {
    searchConfig,
    results,
  };
};
