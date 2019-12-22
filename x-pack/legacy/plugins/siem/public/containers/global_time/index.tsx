/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { inputsModel, inputsSelectors, State } from '../../store';
import { inputsActions } from '../../store/actions';

interface SetQuery {
  id: string;
  inspect: inputsModel.InspectQuery | null;
  loading: boolean;
  refetch: inputsModel.Refetch | inputsModel.RefetchKql;
}

export interface GlobalTimeArgs {
  from: number;
  to: number;
  setQuery: ({ id, inspect, loading, refetch }: SetQuery) => void;
  deleteQuery?: ({ id }: { id: string }) => void;
  isInitializing: boolean;
}

interface OwnProps {
  children: (args: GlobalTimeArgs) => React.ReactNode;
}

type GlobalTimeProps = OwnProps & GlobalTimeReduxProps;

export const GlobalTimeComponent = React.memo(
  ({ children, deleteAllQuery, deleteOneQuery, from, to, setGlobalQuery }: GlobalTimeProps) => {
    const [isInitializing, setIsInitializing] = useState(true);

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
          setQuery: ({ id, inspect, loading, refetch }: SetQuery) =>
            setGlobalQuery({ inputId: 'global', id, inspect, loading, refetch }),
          deleteQuery: ({ id }: { id: string }) => deleteOneQuery({ inputId: 'global', id }),
        })}
      </>
    );
  }
);

const mapStateToProps = (state: State) => {
  const timerange: inputsModel.TimeRange = inputsSelectors.globalTimeRangeSelector(state);
  return {
    from: timerange.from,
    to: timerange.to,
  };
};

export const connector = connect(mapStateToProps, {
  deleteAllQuery: inputsActions.deleteAllQuery,
  deleteOneQuery: inputsActions.deleteOneQuery,
  setGlobalQuery: inputsActions.setQuery,
});

type GlobalTimeReduxProps = ConnectedProps<typeof connector>;

export const GlobalTime = connector(GlobalTimeComponent);
