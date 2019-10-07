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
  KueryFilterQuery,
  networkModel,
  networkSelectors,
  SerializedFilterQuery,
  State,
  inputsModel,
} from '../../store';
import { networkActions } from '../../store/actions';
import { useUpdateKql } from '../../utils/kql/use_update_kql';

export interface NetworkFilterArgs {
  applyFilterQueryFromKueryExpression: (expression: string) => void;
  filterQueryDraft: KueryFilterQuery;
  isFilterQueryDraftValid: boolean;
  setFilterQueryDraftFromKueryExpression: (expression: string) => void;
}

interface OwnProps {
  children: (args: NetworkFilterArgs) => React.ReactNode;
  indexPattern: StaticIndexPattern;
  setQuery?: (params: {
    id: string;
    inspect: null;
    loading: boolean;
    refetch: inputsModel.Refetch | inputsModel.RefetchKql;
  }) => void;
  type: networkModel.NetworkType;
}

interface NetworkFilterReduxProps {
  isNetworkFilterQueryDraftValid: boolean;
  kueryFilterQuery: KueryFilterQuery;
  networkFilterQueryDraft: KueryFilterQuery;
}

interface NetworkFilterDispatchProps {
  applyNetworkFilterQuery: ActionCreator<{
    filterQuery: SerializedFilterQuery;
    networkType: networkModel.NetworkType;
  }>;
  setNetworkFilterQueryDraft: ActionCreator<{
    filterQueryDraft: KueryFilterQuery;
    networkType: networkModel.NetworkType;
  }>;
}

export type NetworkFilterProps = OwnProps & NetworkFilterReduxProps & NetworkFilterDispatchProps;

const NetworkFilterComponent = React.memo<NetworkFilterProps>(
  ({
    applyNetworkFilterQuery,
    children,
    indexPattern,
    isNetworkFilterQueryDraftValid,
    kueryFilterQuery,
    networkFilterQueryDraft,
    setNetworkFilterQueryDraft,
    setQuery,
    type,
  }) => {
    const applyFilterQueryFromKueryExpression = (expression: string) =>
      applyNetworkFilterQuery({
        filterQuery: {
          kuery: {
            kind: 'kuery',
            expression,
          },
          serializedQuery: convertKueryToElasticSearchQuery(expression, indexPattern),
        },
        networkType: type,
      });

    const setFilterQueryDraftFromKueryExpression = (expression: string) =>
      setNetworkFilterQueryDraft({
        filterQueryDraft: {
          kind: 'kuery',
          expression,
        },
        networkType: type,
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
            kueryFilterQueryDraft: networkFilterQueryDraft,
            storeType: 'networkType',
            type,
          }),
        });
      }
    }, [networkFilterQueryDraft, kueryFilterQuery, type]);
    return (
      <>
        {children({
          applyFilterQueryFromKueryExpression: memoizedApplyFilter,
          filterQueryDraft: networkFilterQueryDraft,
          isFilterQueryDraftValid: isNetworkFilterQueryDraftValid,
          setFilterQueryDraftFromKueryExpression: memoizedSetFilter,
        })}
      </>
    );
  }
);

NetworkFilterComponent.displayName = 'NetworkFilterComponent';

const makeMapStateToProps = () => {
  const getNetworkFilterQueryDraft = networkSelectors.networkFilterQueryDraft();
  const getIsNetworkFilterQueryDraftValid = networkSelectors.isNetworkFilterQueryDraftValid();
  const getNetworkKueryFilterQuery = networkSelectors.networkFilterQueryAsKuery();
  const mapStateToProps = (state: State, { type }: OwnProps) => {
    return {
      isNetworkFilterQueryDraftValid: getIsNetworkFilterQueryDraftValid(state, type),
      kueryFilterQuery: getNetworkKueryFilterQuery(state, type),
      networkFilterQueryDraft: getNetworkFilterQueryDraft(state, type),
    };
  };
  return mapStateToProps;
};

export const NetworkFilter = connect(
  makeMapStateToProps,
  {
    applyNetworkFilterQuery: networkActions.applyNetworkFilterQuery,
    setNetworkFilterQueryDraft: networkActions.setNetworkFilterQueryDraft,
  }
)(NetworkFilterComponent);
