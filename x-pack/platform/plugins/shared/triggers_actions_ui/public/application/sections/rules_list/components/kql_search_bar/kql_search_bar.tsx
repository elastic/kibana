/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { DataView } from '@kbn/data-views-plugin/common';
import { fromKueryExpression, KueryNode, Query } from '@kbn/es-query';

import useAsync from 'react-use/lib/useAsync';
import { isEmpty } from 'lodash';

import { useKibana } from '../../../../../common/lib/kibana';
import { NO_INDEX_PATTERNS } from '../../../alerts_search_bar/constants';
import { validateFieldsKueryNode } from './validate_kuery_node';
import { suggestionsAbstraction } from './constants';
import { enhanceSuggestionAbstractionFields } from './helpers';

export interface KqlSearchBarProps {
  onQuerySubmit: (kueryNode: KueryNode) => void;
}

export const KqlSearchBar = React.memo<KqlSearchBarProps>(({ onQuerySubmit }) => {
  const {
    http,
    notifications: { toasts },
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana().services;

  const {
    value: fields,
    loading,
    error,
  } = useAsync(async () => {
    return http.post<Array<{ name: string; esTypes: string[] }>>(
      `/internal/rules/saved_objects/fields`,
      {
        body: JSON.stringify({
          fields: Object.keys(suggestionsAbstraction.fields).filter((key) =>
            key.includes('alert.')
          ),
        }),
      }
    );
  }, []);

  const dataView = [
    {
      title: '',
      fieldFormatMap: {},
      fields: fields?.map((field) => {
        return {
          ...field,
          ...(suggestionsAbstraction.fields[field.name]
            ? { customLabel: suggestionsAbstraction.fields[field.name].displayField }
            : {}),
          ...(field.esTypes.includes('flattened') ? { type: 'string' } : {}),
        };
      }),
    },
  ] as unknown as DataView[];

  const saMemo = useMemo(() => enhanceSuggestionAbstractionFields(suggestionsAbstraction), []);

  const handleQuerySubmit = ({ query }: { query?: Query }) => {
    let kueryNode = {} as KueryNode;
    if (!isEmpty(query?.query)) {
      kueryNode = fromKueryExpression(query?.query ?? '');
      try {
        validateFieldsKueryNode({ astFilter: kueryNode, suggestionsAbstraction: saMemo });
      } catch (e) {
        toasts.addDanger(e.toString());
        return;
      }
    }
    onQuerySubmit(kueryNode);
  };

  return (
    <SearchBar
      appName="StackRules"
      disableQueryLanguageSwitcher={true}
      query={{ query: '', language: 'kuery' }}
      indexPatterns={loading || error ? NO_INDEX_PATTERNS : dataView}
      showAutoRefreshOnly={false}
      showDatePicker={false}
      showQueryInput={true}
      showQueryMenu={false}
      showFilterBar={true}
      showSubmitButton={false}
      suggestionsAbstraction={saMemo}
      onQuerySubmit={handleQuerySubmit}
    />
  );
});
