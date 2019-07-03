/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';

import { inputsModel, inputsSelectors, State } from '../../store';
import { inputsActions } from '../../store/actions';
import { InputsModelId } from '../../store/inputs/constants';

interface GlobalTimeArgs {
  from: number;
  to: number;
  setQuery: (
    {
      id,
      inspect,
      loading,
      refetch,
    }: {
      id: string;
      inspect: inputsModel.InspectQuery | null;
      loading: boolean;
      refetch: inputsModel.Refetch;
    }
  ) => void;
}

interface OwnProps {
  children: (args: GlobalTimeArgs) => React.ReactNode;
}

interface GlobalTimeDispatch {
  setGlobalQuery: ActionCreator<{
    inputId: InputsModelId;
    id: string;
    inspect: inputsModel.InspectQuery | null;
    loading: boolean;
    refetch: inputsModel.Refetch;
  }>;
  deleteAllQuery: ActionCreator<{ id: InputsModelId }>;
}

interface GlobalTimeReduxState {
  from: number;
  to: number;
}

type GlobalTimeProps = OwnProps & GlobalTimeReduxState & GlobalTimeDispatch;

class GlobalTimeComponent extends React.PureComponent<GlobalTimeProps> {
  public componentWillUnmount() {
    this.props.deleteAllQuery({ id: 'global' });
  }

  public render() {
    const { children, from, to, setGlobalQuery } = this.props;
    return (
      <>
        {children({
          from,
          to,
          setQuery: ({ id, inspect, loading, refetch }) =>
            setGlobalQuery({ inputId: 'global', id, inspect, loading, refetch }),
        })}
      </>
    );
  }
}

const mapStateToProps = (state: State) => {
  const timerange: inputsModel.TimeRange = inputsSelectors.globalTimeRangeSelector(state);
  return {
    from: timerange.from,
    to: timerange.to,
  };
};

export const GlobalTime = connect(
  mapStateToProps,
  {
    deleteAllQuery: inputsActions.deleteAllQuery,
    setGlobalQuery: inputsActions.setQuery,
  }
)(GlobalTimeComponent);
