/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';
import { StaticIndexPattern } from 'ui/index_patterns';

import memoizeOne from 'memoize-one';
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
  type: networkModel.NetworkType;
  setQuery?: (params: {
    id: string;
    inspect: null;
    loading: boolean;
    refetch: inputsModel.Refetch | inputsModel.RefetchKql;
  }) => void;
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

class NetworkFilterComponent extends React.PureComponent<NetworkFilterProps> {
  private memoizedApplyFilterQueryFromKueryExpression: (expression: string) => void;
  private memoizedSetFilterQueryDraftFromKueryExpression: (expression: string) => void;

  constructor(props: NetworkFilterProps) {
    super(props);
    this.memoizedApplyFilterQueryFromKueryExpression = memoizeOne(
      this.applyFilterQueryFromKueryExpression
    );
    this.memoizedSetFilterQueryDraftFromKueryExpression = memoizeOne(
      this.setFilterQueryDraftFromKueryExpression
    );
  }

  public componentDidUpdate(prevProps: NetworkFilterProps) {
    const { indexPattern, networkFilterQueryDraft, kueryFilterQuery, setQuery, type } = this.props;

    if (
      setQuery &&
      (!isEqual(prevProps.networkFilterQueryDraft, networkFilterQueryDraft) ||
        !isEqual(prevProps.kueryFilterQuery, kueryFilterQuery) ||
        prevProps.type !== type)
    ) {
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
  }

  public render() {
    const { children, networkFilterQueryDraft, isNetworkFilterQueryDraftValid } = this.props;

    return (
      <>
        {children({
          applyFilterQueryFromKueryExpression: this.memoizedApplyFilterQueryFromKueryExpression,
          filterQueryDraft: networkFilterQueryDraft,
          isFilterQueryDraftValid: isNetworkFilterQueryDraftValid,
          setFilterQueryDraftFromKueryExpression: this
            .memoizedSetFilterQueryDraftFromKueryExpression,
        })}
      </>
    );
  }
  private applyFilterQueryFromKueryExpression = (expression: string) =>
    this.props.applyNetworkFilterQuery({
      filterQuery: {
        kuery: {
          kind: 'kuery',
          expression,
        },
        serializedQuery: convertKueryToElasticSearchQuery(expression, this.props.indexPattern),
      },
      networkType: this.props.type,
    });

  private setFilterQueryDraftFromKueryExpression = (expression: string) =>
    this.props.setNetworkFilterQueryDraft({
      filterQueryDraft: {
        kind: 'kuery',
        expression,
      },
      networkType: this.props.type,
    });
}

const makeMapStateToProps = () => {
  const getNetworkFilterQueryDraft = networkSelectors.networkFilterQueryDraft();
  const getIsNetworkFilterQueryDraftValid = networkSelectors.isNetworkFilterQueryDraftValid();
  const getNetworkKueryFilterQuery = networkSelectors.networkFilterQueryAsKuery();
  const mapStateToProps = (state: State, { type }: OwnProps) => {
    return {
      networkFilterQueryDraft: getNetworkFilterQueryDraft(state, type),
      isNetworkFilterQueryDraftValid: getIsNetworkFilterQueryDraftValid(state, type),
      kueryFilterQuery: getNetworkKueryFilterQuery(state, type),
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
