/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import React, { useState } from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';

import { inputsModel, inputsSelectors, State } from '../../store';
import { InputsModelId } from '../../store/inputs/constants';
import { inputsActions } from '../../store/inputs';

import { ModalInspectQuery } from './modal';

interface OwnProps {
  queryId: string;
  inspectIndex: number;
  title: string | React.ReactElement;
}

interface InspectButtonReducer {
  id: string;
  isInspected: boolean;
  loading: boolean;
  inspect: inputsModel.InspectQuery | null;
}

interface InspectButtonDispatch {
  setIsInspected: ActionCreator<{
    id: string;
    inputId: InputsModelId;
    isInspected: boolean;
  }>;
}

type InspectButtonProps = OwnProps & InspectButtonReducer & InspectButtonDispatch;

const InspectButtonComponent = ({
  inspect,
  isInspected,
  loading,
  inspectIndex = 0,
  queryId = '',
  setIsInspected,
  title = '',
}: InspectButtonProps) => {
  const [isShowing, setIsShowing] = useState(false);

  return (
    <>
      <EuiButtonEmpty
        iconSide="left"
        iconType="inspect"
        isDisabled={loading}
        isLoading={loading}
        onClick={() => {
          setIsInspected({ id: queryId, inputId: 'global', isInspected: true });
          setIsShowing(true);
        }}
        size="s"
      >
        {'Inspect'}
      </EuiButtonEmpty>
      <ModalInspectQuery
        closeModal={() => {
          setIsShowing(false);
          setIsInspected({ id: queryId, inputId: 'global', isInspected: false });
        }}
        isShowing={!loading && isShowing && isInspected}
        request={inspect != null && inspect.dsl.length > 0 ? inspect.dsl[inspectIndex] : null}
        response={
          inspect != null && inspect.response.length > 0 ? inspect.response[inspectIndex] : null
        }
        title={`${title} - Query Inspection`}
      />
    </>
  );
};

const makeMapStateToProps = () => {
  const getQuery = inputsSelectors.globalQueryByIdSelector();
  const mapStateToProps = (state: State, { queryId }: OwnProps) => {
    return getQuery(state, queryId);
  };
  return mapStateToProps;
};

export const InspectButton = connect(
  makeMapStateToProps,
  {
    setIsInspected: inputsActions.setInspectionParameter,
  }
)(InspectButtonComponent);
