/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import memoizeOne from 'memoize-one';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';
import { StaticIndexPattern } from 'ui/index_patterns';

import { convertKueryToElasticSearchQuery } from '../../lib/keury';
import {
  hostsModel,
  hostsSelectors,
  KueryFilterQuery,
  SerializedFilterQuery,
  State,
  inputsModel,
} from '../../store';
import { hostsActions } from '../../store/actions';
import { useUpdateKql } from '../../utils/kql/use_update_kql';

export interface HostsFilterArgs {
  applyFilterQueryFromKueryExpression: (expression: string) => void;
  filterQueryDraft: KueryFilterQuery;
  isFilterQueryDraftValid: boolean;
  setFilterQueryDraftFromKueryExpression: (expression: string) => void;
}

interface OwnProps {
  children: (args: HostsFilterArgs) => React.ReactNode;
  indexPattern: StaticIndexPattern;
  type: hostsModel.HostsType;
  setQuery?: (params: {
    id: string;
    inspect: null;
    loading: boolean;
    refetch: inputsModel.Refetch | inputsModel.RefetchKql;
  }) => void;
}

interface HostsFilterReduxProps {
  hostsFilterQueryDraft: KueryFilterQuery;
  isHostFilterQueryDraftValid: boolean;
  kueryFilterQuery: KueryFilterQuery;
}

interface HostsFilterDispatchProps {
  applyHostsFilterQuery: ActionCreator<{
    filterQuery: SerializedFilterQuery;
    hostsType: hostsModel.HostsType;
  }>;
  setHostsFilterQueryDraft: ActionCreator<{
    filterQueryDraft: KueryFilterQuery;
    hostsType: hostsModel.HostsType;
  }>;
}

export type HostsFilterProps = OwnProps & HostsFilterReduxProps & HostsFilterDispatchProps;

const HostsFilterComponent = React.memo<HostsFilterProps>(
  ({
    applyHostsFilterQuery,
    children,
    hostsFilterQueryDraft,
    indexPattern,
    isHostFilterQueryDraftValid,
    kueryFilterQuery,
    setHostsFilterQueryDraft,
    setQuery,
    type,
  }) => {
    const applyFilterQueryFromKueryExpression = (expression: string) =>
      applyHostsFilterQuery({
        filterQuery: {
          kuery: {
            kind: 'kuery',
            expression,
          },
          serializedQuery: convertKueryToElasticSearchQuery(expression, indexPattern),
        },
        hostsType: type,
      });

    const setFilterQueryDraftFromKueryExpression = (expression: string) =>
      setHostsFilterQueryDraft({
        filterQueryDraft: {
          kind: 'kuery',
          expression,
        },
        hostsType: type,
      });

    const memoizedApplyFilter = memoizeOne(applyFilterQueryFromKueryExpression);
    const memoizedSetFilter = memoizeOne(setFilterQueryDraftFromKueryExpression);
    useEffect(() => {
      if (setQuery) {
        setQuery({
          id: 'kql',
          inspect: null,
          loading: false,
          refetch: useUpdateKql({
            indexPattern,
            kueryFilterQuery,
            kueryFilterQueryDraft: hostsFilterQueryDraft,
            storeType: 'hostsType',
            type,
          }),
        });
      }
    }, [hostsFilterQueryDraft, kueryFilterQuery, type]);

    return (
      <>
        {children({
          applyFilterQueryFromKueryExpression: memoizedApplyFilter,
          filterQueryDraft: hostsFilterQueryDraft,
          isFilterQueryDraftValid: isHostFilterQueryDraftValid,
          setFilterQueryDraftFromKueryExpression: memoizedSetFilter,
        })}
      </>
    );
  }
);

HostsFilterComponent.displayName = 'HostsFilterComponent';

const makeMapStateToProps = () => {
  const getHostsFilterQueryDraft = hostsSelectors.hostsFilterQueryDraft();
  const getIsHostFilterQueryDraftValid = hostsSelectors.isHostFilterQueryDraftValid();
  const getHostsKueryFilterQuery = hostsSelectors.hostsFilterQueryAsKuery();
  const mapStateToProps = (state: State, { type }: OwnProps) => {
    return {
      hostsFilterQueryDraft: getHostsFilterQueryDraft(state, type),
      isHostFilterQueryDraftValid: getIsHostFilterQueryDraftValid(state, type),
      kueryFilterQuery: getHostsKueryFilterQuery(state, type),
    };
  };
  return mapStateToProps;
};

export const HostsFilter = connect(
  makeMapStateToProps,
  {
    applyHostsFilterQuery: hostsActions.applyHostsFilterQuery,
    setHostsFilterQueryDraft: hostsActions.setHostsFilterQueryDraft,
  }
)(HostsFilterComponent);
