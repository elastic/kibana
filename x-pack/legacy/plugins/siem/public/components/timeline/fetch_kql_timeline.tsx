/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { memo, useEffect } from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';
import { IIndexPattern } from 'src/plugins/data/public';

import { inputsModel, KueryFilterQuery, timelineSelectors, State } from '../../store';
import { inputsActions } from '../../store/actions';
import { InputsModelId } from '../../store/inputs/constants';
import { useUpdateKql } from '../../utils/kql/use_update_kql';

interface TimelineKqlFetchRedux {
  kueryFilterQuery: KueryFilterQuery | null;
  kueryFilterQueryDraft: KueryFilterQuery | null;
}

interface TimelineKqlFetchDispatch {
  setTimelineQuery: ActionCreator<{
    id: string;
    inputId: InputsModelId;
    inspect: inputsModel.InspectQuery | null;
    loading: boolean;
    refetch: inputsModel.Refetch | inputsModel.RefetchKql | null;
  }>;
}

export interface TimelineKqlFetchProps {
  id: string;
  indexPattern: IIndexPattern;
  inputId: InputsModelId;
}

type OwnProps = TimelineKqlFetchProps & TimelineKqlFetchRedux & TimelineKqlFetchDispatch;

const TimelineKqlFetchComponent = memo<OwnProps>(
  ({ id, indexPattern, inputId, kueryFilterQuery, kueryFilterQueryDraft, setTimelineQuery }) => {
    useEffect(() => {
      setTimelineQuery({
        id: 'kql',
        inputId,
        inspect: null,
        loading: false,
        refetch: useUpdateKql({
          indexPattern,
          kueryFilterQuery,
          kueryFilterQueryDraft,
          storeType: 'timelineType',
          timelineId: id,
        }),
      });
    }, [kueryFilterQueryDraft, kueryFilterQuery, id]);
    return null;
  }
);

const makeMapStateToProps = () => {
  const getTimelineKueryFilterQueryDraft = timelineSelectors.getKqlFilterQueryDraftSelector();
  const getTimelineKueryFilterQuery = timelineSelectors.getKqlFilterKuerySelector();
  const mapStateToProps = (state: State, { id }: TimelineKqlFetchProps) => {
    return {
      kueryFilterQuery: getTimelineKueryFilterQuery(state, id),
      kueryFilterQueryDraft: getTimelineKueryFilterQueryDraft(state, id),
    };
  };
  return mapStateToProps;
};

export const TimelineKqlFetch = connect(makeMapStateToProps, {
  setTimelineQuery: inputsActions.setQuery,
})(TimelineKqlFetchComponent);
