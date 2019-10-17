/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Filter } from '@kbn/es-query';
import { isEqual } from 'lodash/fp';
import React, { memo, useCallback, useState, useEffect } from 'react';
import { StaticIndexPattern } from 'ui/index_patterns';

import { Query } from 'src/plugins/data/common/types';

import { SavedQuery } from '../../../../../../../../src/legacy/core_plugins/data/public';
import { KueryFilterQuery, KueryFilterQueryKind } from '../../../store';
import { QueryBar } from '../../query_bar';

interface QueryBarTimelineComponentProps {
  applyKqlFilterQuery: (expression: string, kind: KueryFilterQueryKind) => void;
  filters: Filter[];
  filterQueryDraft: KueryFilterQuery;
  indexPattern: StaticIndexPattern;
  savedQuery: SavedQuery | null;
  setFilters: (filters: Filter[]) => void;
  setKqlFilterQueryDraft: (expression: string, kind: KueryFilterQueryKind) => void;
  setSavedQuery: (savedQuery: SavedQuery | null) => void;
}

export const QueryBarTimeline = memo<QueryBarTimelineComponentProps>(
  ({
    applyKqlFilterQuery,
    filters,
    filterQueryDraft,
    indexPattern,
    savedQuery,
    setFilters,
    setKqlFilterQueryDraft,
    setSavedQuery,
  }) => {
    const [filterQuery, setFilterQuery] = useState<Query>({
      query: filterQueryDraft != null ? filterQueryDraft.expression : '',
      language: filterQueryDraft != null ? filterQueryDraft.kind : 'kuery',
    });

    useEffect(() => {
      setFilterQuery({
        query: filterQueryDraft != null ? filterQueryDraft.expression : '',
        language: filterQueryDraft != null ? filterQueryDraft.kind : 'kuery',
      });
    }, [filterQueryDraft]);

    const onChangedQueryAndFilter = useCallback(
      ({ query: newQuery, filters: newFilters }: { query: Query; filters: Filter[] }) => {
        if (
          filterQueryDraft == null ||
          ((filterQueryDraft != null && filterQueryDraft.expression !== newQuery.query) ||
            filterQueryDraft.kind !== newQuery.language)
        ) {
          setKqlFilterQueryDraft(
            newQuery.query as string,
            newQuery.language as KueryFilterQueryKind
          );
        }
        if (!isEqual(filters, newFilters)) {
          setFilters(newFilters);
        }
      },
      [filterQueryDraft]
    );

    const onSubmitQueryAndFilter = useCallback(
      ({ query: newQuery, filters: newFilters }: { query: Query; filters: Filter[] }) => {
        if (
          filterQueryDraft == null ||
          ((filterQueryDraft != null && filterQueryDraft.expression !== newQuery.query) ||
            filterQueryDraft.kind !== newQuery.language)
        ) {
          setKqlFilterQueryDraft(
            newQuery.query as string,
            newQuery.language as KueryFilterQueryKind
          );
          applyKqlFilterQuery(newQuery.query as string, newQuery.language as KueryFilterQueryKind);
        }
        if (!isEqual(filters, newFilters)) {
          setFilters(newFilters);
        }
      },
      [filterQueryDraft]
    );

    return (
      <QueryBar
        indexPattern={indexPattern}
        filterQuery={filterQuery}
        filters={filters}
        onChangedQueryAndFilter={onChangedQueryAndFilter}
        onSubmitQueryAndFilter={onSubmitQueryAndFilter}
        savedQuery={savedQuery}
        setSavedQuery={setSavedQuery}
      />
    );
  }
);
