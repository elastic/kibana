/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFormRow } from '@elastic/eui';
import { isEqual } from 'lodash/fp';
import React, { useCallback, useEffect, useState } from 'react';
import { StaticIndexPattern } from 'ui/index_patterns';
import { Subscription } from 'rxjs';
import styled from 'styled-components';

import { SavedQueryTimeFilter } from '../../../../../../../../../../src/legacy/core_plugins/data/public/search';
import { SavedQuery } from '../../../../../../../../../../src/legacy/core_plugins/data/public';
import {
  esFilters,
  Query,
  FilterManager,
} from '../../../../../../../../../../src/plugins/data/public';

import { QueryBar } from '../../../../../components/query_bar';
import { useKibanaCore } from '../../../../../lib/compose/kibana_core';
import { useSavedQueryServices } from '../../../../../utils/saved_query_services';

import { FieldHook, getFieldValidityAndErrorMessage } from '../shared_imports';

export interface FieldValueQueryBar {
  filters: esFilters.Filter[];
  query: Query;
  saved_id: string;
}
interface QueryBarDefineRuleProps {
  dataTestSubj: string;
  field: FieldHook;
  idAria: string;
  isDisabled?: string;
  isLoading: boolean;
  indexPattern: StaticIndexPattern;
}

const StyledEuiFormRow = styled(EuiFormRow)`
  .kbnTypeahead__items {
    max-height: 14vh !important;
  }
`;

// TODO need to add disabled in the SearchBar

export const QueryBarDefineRule = ({
  dataTestSubj,
  field,
  idAria,
  indexPattern,
  isLoading = false,
}: QueryBarDefineRuleProps) => {
  const [savedQuery, setSavedQuery] = useState<SavedQuery | null>(null);
  const [queryDraft, setQueryDraft] = useState<Query>({ query: '', language: 'kuery' });
  const [queryFilters, setQueryFilters] = useState<esFilters.Filter[]>([]);
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

  const core = useKibanaCore();
  const [filterManager] = useState<FilterManager>(new FilterManager(core.uiSettings));

  const savedQueryServices = useSavedQueryServices();

  useEffect(() => {
    let isSubscribed = true;
    const subscriptions = new Subscription();
    filterManager.setFilters(queryFilters);

    subscriptions.add(
      filterManager.getUpdates$().subscribe({
        next: () => {
          if (isSubscribed) {
            const newFilters = filterManager.getFilters();
            const { filters } = field.value as FieldValueQueryBar;

            setQueryFilters(newFilters);
            if (!isEqual(filters, newFilters)) {
              field.setValue({ ...(field.value as FieldValueQueryBar), filters: newFilters });
            }
          }
        },
      })
    );

    return () => {
      isSubscribed = false;
      subscriptions.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isSubscribed = true;
    async function updateFilterQueryFromValue() {
      const { filters, query, saved_id: savedId } = field.value as FieldValueQueryBar;
      if (!isEqual(query, queryDraft)) {
        setQueryDraft(query);
      }
      if (!isEqual(filters, queryFilters)) {
        setQueryFilters(filters);
      }
      if (
        (savedId != null && savedQuery != null && savedId !== savedQuery.id) ||
        (savedId != null && savedQuery == null)
      ) {
        try {
          const mySavedQuery = await savedQueryServices.getSavedQuery(savedId);
          if (isSubscribed && mySavedQuery != null) {
            setSavedQuery(mySavedQuery);
          }
        } catch {
          setSavedQuery(null);
        }
      } else if (savedId == null && savedQuery != null) {
        setSavedQuery(null);
      }
    }
    updateFilterQueryFromValue();
    return () => {
      isSubscribed = false;
    };
  }, [field.value]);

  useEffect(() => {
    if (!isEqual(queryFilters, filterManager.getFilters())) {
      filterManager.setFilters(queryFilters);
    }
  }, [queryFilters]);

  const onSubmitQuery = useCallback(
    (newQuery: Query, timefilter?: SavedQueryTimeFilter) => {
      const { query } = field.value as FieldValueQueryBar;
      if (!isEqual(query, newQuery)) {
        field.setValue({ ...(field.value as FieldValueQueryBar), query: newQuery });
      }
    },
    [field]
  );

  const onChangedQuery = useCallback(
    (newQuery: Query) => {
      const { query } = field.value as FieldValueQueryBar;
      if (!isEqual(query, newQuery)) {
        field.setValue({ ...(field.value as FieldValueQueryBar), query: newQuery });
      }
    },
    [field]
  );

  const onSavedQuery = useCallback(
    (newSavedQuery: SavedQuery | null) => {
      if (newSavedQuery != null) {
        const { saved_id: savedId } = field.value as FieldValueQueryBar;
        if (newSavedQuery.id !== savedId) {
          setSavedQuery(newSavedQuery);
          field.setValue({
            filters: newSavedQuery.attributes.filters,
            query: newSavedQuery.attributes.query,
            saved_id: newSavedQuery.id,
          });
        }
      }
    },
    [field.value]
  );

  return (
    <StyledEuiFormRow
      label={field.label}
      labelAppend={field.labelAppend}
      helpText={field.helpText}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
      data-test-subj={dataTestSubj}
      describedByIds={idAria ? [idAria] : undefined}
    >
      <QueryBar
        indexPattern={indexPattern}
        isLoading={isLoading}
        isRefreshPaused={false}
        filterQuery={queryDraft}
        filterManager={filterManager}
        filters={queryFilters}
        onChangedQuery={onChangedQuery}
        onSubmitQuery={onSubmitQuery}
        savedQuery={savedQuery}
        onSavedQuery={onSavedQuery}
      />
    </StyledEuiFormRow>
  );
};
