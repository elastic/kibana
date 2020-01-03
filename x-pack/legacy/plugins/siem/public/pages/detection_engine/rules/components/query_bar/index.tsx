/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFormRow, EuiMutationObserver } from '@elastic/eui';
import { isEqual } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Subscription } from 'rxjs';
import styled from 'styled-components';

import {
  esFilters,
  IIndexPattern,
  Query,
  FilterManager,
  SavedQuery,
  SavedQueryTimeFilter,
} from '../../../../../../../../../../src/plugins/data/public';

import { BrowserFields } from '../../../../../containers/source';
import { OpenTimelineModal } from '../../../../../components/open_timeline/open_timeline_modal';
import { ActionTimelineToShow } from '../../../../../components/open_timeline/types';
import { QueryBar } from '../../../../../components/query_bar';
import { buildGlobalQuery } from '../../../../../components/timeline/helpers';
import { getDataProviderFilter } from '../../../../../components/timeline/query_bar';
import { convertKueryToElasticSearchQuery } from '../../../../../lib/keury';
import { useKibana } from '../../../../../lib/kibana';
import { TimelineModel } from '../../../../../store/timeline/model';
import { useSavedQueryServices } from '../../../../../utils/saved_query_services';
import { FieldHook, getFieldValidityAndErrorMessage } from '../shared_imports';
import * as i18n from './translations';

export interface FieldValueQueryBar {
  filters: esFilters.Filter[];
  query: Query;
  saved_id: string | null;
}
interface QueryBarDefineRuleProps {
  browserFields: BrowserFields;
  dataTestSubj: string;
  field: FieldHook;
  idAria: string;
  isLoading: boolean;
  indexPattern: IIndexPattern;
  onCloseTimelineSearch: () => void;
  openTimelineSearch: boolean;
  resizeParentContainer?: (height: number) => void;
}

const StyledEuiFormRow = styled(EuiFormRow)`
  .kbnTypeahead__items {
    max-height: 14vh !important;
  }
  .globalQueryBar {
    padding: 4px 0px 0px 0px;
    .kbnQueryBar {
      & > div:first-child {
        margin: 0px 0px 0px 4px;
      }
    }
  }
`;

// TODO need to add disabled in the SearchBar

export const QueryBarDefineRule = ({
  browserFields,
  dataTestSubj,
  field,
  idAria,
  indexPattern,
  isLoading = false,
  onCloseTimelineSearch,
  openTimelineSearch = false,
  resizeParentContainer,
}: QueryBarDefineRuleProps) => {
  const [originalHeight, setOriginalHeight] = useState(-1);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [savedQuery, setSavedQuery] = useState<SavedQuery | null>(null);
  const [queryDraft, setQueryDraft] = useState<Query>({ query: '', language: 'kuery' });
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

  const kibana = useKibana();
  const [filterManager] = useState<FilterManager>(new FilterManager(kibana.services.uiSettings));

  const savedQueryServices = useSavedQueryServices();

  useEffect(() => {
    let isSubscribed = true;
    const subscriptions = new Subscription();
    filterManager.setFilters([]);

    subscriptions.add(
      filterManager.getUpdates$().subscribe({
        next: () => {
          if (isSubscribed) {
            const newFilters = filterManager.getFilters();
            const { filters } = field.value as FieldValueQueryBar;

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
  }, [field.value]);

  useEffect(() => {
    let isSubscribed = true;
    async function updateFilterQueryFromValue() {
      const { filters, query, saved_id: savedId } = field.value as FieldValueQueryBar;
      if (!isEqual(query, queryDraft)) {
        setQueryDraft(query);
      }
      if (!isEqual(filters, filterManager.getFilters())) {
        filterManager.setFilters(filters);
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

  const onCloseTimelineModal = useCallback(() => {
    setLoadingTimeline(true);
    onCloseTimelineSearch();
  }, []);

  const onOpenTimeline = useCallback(
    (timeline: TimelineModel) => {
      setLoadingTimeline(false);
      const newQuery = {
        query: timeline.kqlQuery.filterQuery?.kuery?.expression ?? '',
        language: timeline.kqlQuery.filterQuery?.kuery?.kind ?? 'kuery',
      };
      const dataProvidersDsl =
        timeline.dataProviders != null && timeline.dataProviders.length > 0
          ? convertKueryToElasticSearchQuery(
              buildGlobalQuery(timeline.dataProviders, browserFields),
              indexPattern
            )
          : '';
      const newFilters = timeline.filters ?? [];
      field.setValue({
        filters:
          dataProvidersDsl !== ''
            ? [...newFilters, getDataProviderFilter(dataProvidersDsl)]
            : newFilters,
        query: newQuery,
        saved_id: '',
      });
    },
    [browserFields, indexPattern]
  );

  const onMutation = (event: unknown, observer: unknown) => {
    if (resizeParentContainer != null) {
      const suggestionContainer = document.getElementById('kbnTypeahead__items');
      if (suggestionContainer != null) {
        const box = suggestionContainer.getBoundingClientRect();
        const accordionContainer = document.getElementById('define-rule');
        if (accordionContainer != null) {
          const accordionBox = accordionContainer.getBoundingClientRect();
          if (originalHeight === -1 || accordionBox.height < originalHeight + box.height) {
            resizeParentContainer(originalHeight + box.height - 100);
          }
          if (originalHeight === -1) {
            setOriginalHeight(accordionBox.height);
          }
        }
      } else {
        resizeParentContainer(-1);
      }
    }
  };

  const actionTimelineToHide = useMemo<ActionTimelineToShow[]>(() => ['duplicate'], []);

  return (
    <>
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
        <EuiMutationObserver
          observerOptions={{ subtree: true, attributes: true, childList: true }}
          onMutation={onMutation}
        >
          {mutationRef => (
            <div ref={mutationRef}>
              <QueryBar
                indexPattern={indexPattern}
                isLoading={isLoading || loadingTimeline}
                isRefreshPaused={false}
                filterQuery={queryDraft}
                filterManager={filterManager}
                filters={filterManager.getFilters() || []}
                onChangedQuery={onChangedQuery}
                onSubmitQuery={onSubmitQuery}
                savedQuery={savedQuery}
                onSavedQuery={onSavedQuery}
                hideSavedQuery={false}
              />
            </div>
          )}
        </EuiMutationObserver>
      </StyledEuiFormRow>
      {openTimelineSearch ? (
        <OpenTimelineModal
          hideActions={actionTimelineToHide}
          modalTitle={i18n.IMPORT_TIMELINE_MODAL}
          onClose={onCloseTimelineModal}
          onOpen={onOpenTimeline}
        />
      ) : null}
    </>
  );
};
