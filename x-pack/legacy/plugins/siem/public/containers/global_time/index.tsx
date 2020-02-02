/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';
import deepEqual from 'fast-deep-equal/react';

import { inputsModel, inputsSelectors, State } from '../../store';
import { inputsActions } from '../../store/actions';
import { InputsModelId } from '../../store/inputs/constants';

interface SetQuery {
  id: string;
  inspect: inputsModel.InspectQuery | null;
  loading: boolean;
  refetch: inputsModel.Refetch | inputsModel.RefetchKql;
}

interface GlobalQuery extends SetQuery {
  inputId: InputsModelId;
}

export interface GlobalTimeArgs {
  from: number;
  to: number;
  setQuery: ({ id, inspect, loading, refetch }: SetQuery) => void;
  deleteQuery?: ({ id }: { id: string }) => void;
  isInitializing: boolean;
}

interface GlobalTimeDispatch {
  setGlobalQuery: ActionCreator<GlobalQuery>;
  deleteAllQuery: ActionCreator<{ id: InputsModelId }>;
  deleteOneQuery: ActionCreator<{ inputId: InputsModelId; id: string }>;
}

interface GlobalTimeReduxState {
  from: number;
  to: number;
}
interface OwnProps {
  children: (args: GlobalTimeArgs) => React.ReactNode;
}

type GlobalTimeProps = OwnProps & GlobalTimeReduxState & GlobalTimeDispatch;

export const GlobalTimeComponent: React.FC<GlobalTimeProps> = ({
  children,
  deleteAllQuery,
  deleteOneQuery,
  from,
  to,
  setGlobalQuery,
}) => {
  const [isInitializing, setIsInitializing] = useState(true);

  const setQuery = useCallback(
    ({ id, inspect, loading, refetch }: SetQuery) =>
      setGlobalQuery({ inputId: 'global', id, inspect, loading, refetch }),
    [setGlobalQuery]
  );

  const deleteQuery = useCallback(
    ({ id }: { id: string }) => deleteOneQuery({ inputId: 'global', id }),
    [deleteOneQuery]
  );

  useEffect(() => {
    if (isInitializing) {
      setIsInitializing(false);
    }
    return () => {
      deleteAllQuery({ id: 'global' });
    };
  }, []);

  return (
    <>
      {children({
        isInitializing,
        from,
        to,
        setQuery,
        deleteQuery,
      })}
    </>
  );
};

const mapStateToProps = (state: State) => {
  const timerange: inputsModel.TimeRange = inputsSelectors.globalTimeRangeSelector(state);
  return {
    from: timerange.from,
    to: timerange.to,
  };
};

const mapDispatchToProps = {
  deleteAllQuery: inputsActions.deleteAllQuery,
  deleteOneQuery: inputsActions.deleteOneQuery,
  setGlobalQuery: inputsActions.setQuery,
};

export const GlobalTime = connect(
  mapStateToProps,
  mapDispatchToProps
)(React.memo(GlobalTimeComponent, deepEqual));
