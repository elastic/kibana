/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import * as React from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';
import { StaticIndexPattern } from 'ui/index_patterns';

import { convertKueryToElasticSearchQuery } from '../../../lib/keury';
import { KueryFilterQuery, SerializedFilterQuery, timelineSelectors } from '../../../store';
import { State } from '../../../store';

import { SearchOrFilter } from './search_or_filter';
import { timelineActions } from '../../../store/actions';
import { KqlMode, TimelineModel } from '../../../store/timeline/model';

interface OwnProps {
  indexPattern: StaticIndexPattern;
  timelineId: string;
}

interface StateReduxProps {
  filterQueryDraft: KueryFilterQuery;
  isFilterQueryDraftValid: boolean;
  kqlMode?: KqlMode;
}

interface DispatchProps {
  applyKqlFilterQuery: ActionCreator<{
    id: string;
    filterQuery: SerializedFilterQuery;
  }>;
  updateKqlMode: ActionCreator<{
    id: string;
    kqlMode: KqlMode;
  }>;
  setKqlFilterQueryDraft: ActionCreator<{
    id: string;
    filterQueryDraft: KueryFilterQuery;
  }>;
}

type Props = OwnProps & StateReduxProps & DispatchProps;

class StatefulSearchOrFilterComponent extends React.PureComponent<Props> {
  public render() {
    const {
      applyKqlFilterQuery,
      indexPattern,
      filterQueryDraft,
      isFilterQueryDraftValid,
      kqlMode,
      timelineId,
      setKqlFilterQueryDraft,
      updateKqlMode,
    } = this.props;

    const applyFilterQueryFromKueryExpression = (expression: string) =>
      applyKqlFilterQuery({
        id: timelineId,
        filterQuery: {
          kuery: {
            kind: 'kuery',
            expression,
          },
          serializedQuery: convertKueryToElasticSearchQuery(expression, indexPattern),
        },
      });

    const setFilterQueryDraftFromKueryExpression = (expression: string) =>
      setKqlFilterQueryDraft({
        id: timelineId,
        filterQueryDraft: {
          kind: 'kuery',
          expression,
        },
      });

    return (
      <SearchOrFilter
        applyKqlFilterQuery={applyFilterQueryFromKueryExpression}
        filterQueryDraft={filterQueryDraft}
        indexPattern={indexPattern}
        isFilterQueryDraftValid={isFilterQueryDraftValid}
        kqlMode={kqlMode!}
        timelineId={timelineId}
        updateKqlMode={updateKqlMode!}
        setKqlFilterQueryDraft={setFilterQueryDraftFromKueryExpression!}
      />
    );
  }
}

const makeMapStateToProps = () => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const getKqlFilterQueryDraft = timelineSelectors.getKqlFilterQueryDraftSelector();
  const isFilterQueryDraftValid = timelineSelectors.isFilterQueryDraftValidSelector();
  const mapStateToProps = (state: State, { timelineId }: OwnProps) => {
    const timeline: TimelineModel | {} = getTimeline(state, timelineId);
    return {
      kqlMode: getOr('filter', 'kqlMode', timeline),
      filterQueryDraft: getKqlFilterQueryDraft(state, timelineId),
      isFilterQueryDraftValid: isFilterQueryDraftValid(state, timelineId),
    };
  };
  return mapStateToProps;
};

export const StatefulSearchOrFilter = connect(
  makeMapStateToProps,
  {
    applyKqlFilterQuery: timelineActions.applyKqlFilterQuery,
    setKqlFilterQueryDraft: timelineActions.setKqlFilterQueryDraft,
    updateKqlMode: timelineActions.updateKqlMode,
  }
)(StatefulSearchOrFilterComponent);
