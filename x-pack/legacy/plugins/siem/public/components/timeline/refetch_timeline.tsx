/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';
import { StaticIndexPattern } from 'ui/index_patterns';

import { isEqual } from 'lodash/fp';
import { inputsModel, KueryFilterQuery, timelineSelectors, State } from '../../store';
import { inputsActions } from '../../store/actions';
import { InputsModelId } from '../../store/inputs/constants';
import { useUpdateKql } from '../../utils/kql/use_update_kql';

interface TimelineRefetchRedux {
  kueryFilterQuery: KueryFilterQuery | null;
  kueryFilterQueryDraft: KueryFilterQuery | null;
}

interface TimelineRefetchDispatch {
  setTimelineQuery: ActionCreator<{
    id: string;
    inputId: InputsModelId;
    inspect: inputsModel.InspectQuery | null;
    loading: boolean;
    refetch: inputsModel.Refetch | inputsModel.RefetchKql;
  }>;
}

interface TimelineRefetchProps {
  children: React.ReactNode;
  id: string;
  indexPattern: StaticIndexPattern;
  inputId: InputsModelId;
  inspect: inputsModel.InspectQuery | null;
  loading: boolean;
  refetch: inputsModel.Refetch;
}

type OwnProps = TimelineRefetchRedux & TimelineRefetchDispatch & TimelineRefetchProps;

class TimelineRefetchComponent extends React.PureComponent<OwnProps> {
  public componentDidUpdate(prevProps: OwnProps) {
    const {
      loading,
      id,
      indexPattern,
      inputId,
      inspect,
      kueryFilterQuery,
      kueryFilterQueryDraft,
      refetch,
    } = this.props;
    if (prevProps.loading !== loading) {
      this.props.setTimelineQuery({ id, inputId, inspect, loading, refetch });
    }
    if (
      !isEqual(prevProps.kueryFilterQueryDraft, this.props.kueryFilterQueryDraft) ||
      !isEqual(prevProps.kueryFilterQuery, this.props.kueryFilterQuery) ||
      prevProps.id !== this.props.id
    ) {
      this.props.setTimelineQuery({
        id: 'kql',
        inputId,
        inspect: null,
        loading: false,
        refetch: useUpdateKql({
          indexPattern,
          kueryFilterQuery,
          kueryFilterQueryDraft,
          storeType: 'timelineType',
          type: null,
          timelineId: id,
        }),
      });
    }
  }

  public render() {
    return <>{this.props.children}</>;
  }
}

const makeMapStateToProps = () => {
  const getTimelineKueryFilterQueryDraft = timelineSelectors.getKqlFilterQueryDraftSelector();
  const getTimelineKueryFilterQuery = timelineSelectors.getKqlFilterKuerySelector();
  const mapStateToProps = (state: State, { id }: TimelineRefetchProps) => {
    return {
      kueryFilterQuery: getTimelineKueryFilterQuery(state, id),
      kueryFilterQueryDraft: getTimelineKueryFilterQueryDraft(state, id),
    };
  };
  return mapStateToProps;
};

export const TimelineRefetch = connect(
  makeMapStateToProps,
  {
    setTimelineQuery: inputsActions.setQuery,
  }
)(TimelineRefetchComponent);
