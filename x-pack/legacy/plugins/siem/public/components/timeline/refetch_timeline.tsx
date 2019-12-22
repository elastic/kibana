/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { memo, useEffect } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { inputsModel } from '../../store';
import { inputsActions } from '../../store/actions';
import { InputsModelId } from '../../store/inputs/constants';

export interface TimelineRefetchProps {
  id: string;
  inputId: InputsModelId;
  inspect: inputsModel.InspectQuery | null;
  loading: boolean;
  refetch: inputsModel.Refetch;
}

type OwnProps = TimelineRefetchProps & TimelineRefetchReduxProps;

const TimelineRefetchComponent = memo<OwnProps>(
  ({ id, inputId, inspect, loading, refetch, setTimelineQuery }) => {
    useEffect(() => {
      setTimelineQuery({ id, inputId, inspect, loading, refetch });
    }, [id, inputId, loading, refetch, inspect]);

    return null;
  }
);

const connector = connect(null, {
  setTimelineQuery: inputsActions.setQuery,
});

type TimelineRefetchReduxProps = ConnectedProps<typeof connector>;

export const TimelineRefetch = connector(TimelineRefetchComponent);
