/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import memoizeOne from 'memoize-one';
import React from 'react';
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

class HostsFilterComponent extends React.PureComponent<HostsFilterProps> {
  private memoizedApplyFilterQueryFromKueryExpression: (expression: string) => void;
  private memoizedSetFilterQueryDraftFromKueryExpression: (expression: string) => void;

  constructor(props: HostsFilterProps) {
    super(props);
    this.memoizedApplyFilterQueryFromKueryExpression = memoizeOne(
      this.applyFilterQueryFromKueryExpression
    );
    this.memoizedSetFilterQueryDraftFromKueryExpression = memoizeOne(
      this.setFilterQueryDraftFromKueryExpression
    );
  }

  public render() {
    const {
      children,
      hostsFilterQueryDraft,
      indexPattern,
      kueryFilterQuery,
      isHostFilterQueryDraftValid,
      setQuery,
      type,
    } = this.props;

    if (setQuery) {
      setQuery({
        id: 'kql',
        inspect: null,
        loading: false,
        refetch: useUpdateKql({
          indexPattern,
          kueryFilterQuery,
          KueryFilterQueryDraft: hostsFilterQueryDraft,
          storeType: 'hostsType',
          type,
        }),
      });
    }

    return (
      <>
        {children({
          applyFilterQueryFromKueryExpression: this.memoizedApplyFilterQueryFromKueryExpression,
          filterQueryDraft: hostsFilterQueryDraft,
          isFilterQueryDraftValid: isHostFilterQueryDraftValid,
          setFilterQueryDraftFromKueryExpression: this
            .memoizedSetFilterQueryDraftFromKueryExpression,
        })}
      </>
    );
  }
  private applyFilterQueryFromKueryExpression = (expression: string) =>
    this.props.applyHostsFilterQuery({
      filterQuery: {
        kuery: {
          kind: 'kuery',
          expression,
        },
        serializedQuery: convertKueryToElasticSearchQuery(expression, this.props.indexPattern),
      },
      hostsType: this.props.type,
    });

  private setFilterQueryDraftFromKueryExpression = (expression: string) =>
    this.props.setHostsFilterQueryDraft({
      filterQueryDraft: {
        kind: 'kuery',
        expression,
      },
      hostsType: this.props.type,
    });
}

const makeMapStateToProps = () => {
  const getHostsFilterQueryDraft = hostsSelectors.hostsFilterQueryDraft();
  const getIsHostFilterQueryDraftValid = hostsSelectors.isHostFilterQueryDraftValid();
  const getHostsKueryFilterQuery = hostsSelectors.hostsFilterQueryAsKuery();
  const mapStateToProps = (state: State, { type }: OwnProps) => {
    return {
      hostsFilterQueryDraft: getHostsFilterQueryDraft(state, type),
      isHostFilterQueryDraftValid: getIsHostFilterQueryDraftValid(state, type),
      kueryFilterQuery: getHostsKueryFilterQuery(state, hostsModel.HostsType.page),
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
