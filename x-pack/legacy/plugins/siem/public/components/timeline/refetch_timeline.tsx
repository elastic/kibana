/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useEffect } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { ActionCreator } from 'typescript-fsa';

import { inputsModel } from '../../store';
import { inputsActions } from '../../store/actions';
import { InputsModelId } from '../../store/inputs/constants';

interface TimelineRefetchDispatch {
  setTimelineQuery: ActionCreator<{
    id: string;
    inputId: InputsModelId;
    inspect: inputsModel.InspectQuery | null;
    loading: boolean;
    refetch: inputsModel.Refetch | inputsModel.RefetchKql | null;
  }>;
}

export interface TimelineRefetchProps {
  id: string;
  inputId: InputsModelId;
  inspect: inputsModel.InspectQuery | null;
  loading: boolean;
  refetch: inputsModel.Refetch | null;
}

type OwnProps = TimelineRefetchProps & TimelineRefetchDispatch;

const TimelineRefetchComponent = memo<OwnProps>(
  ({ id, inputId, inspect, loading, refetch, setTimelineQuery }) => {
    useEffect(() => {
      setTimelineQuery({ id, inputId, inspect, loading, refetch });
    }, [id, inputId, loading, refetch, inspect]);

    return null;
  }
);

export const TimelineRefetch = compose<React.ComponentClass<TimelineRefetchProps>>(
  connect(null, {
    setTimelineQuery: inputsActions.setQuery,
  })
)(TimelineRefetchComponent);
