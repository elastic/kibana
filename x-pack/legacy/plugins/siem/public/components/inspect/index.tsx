/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiLoadingSpinner, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';

import { inputsModel, inputsSelectors, State } from '../../store';
import { InputsModelId } from '../../store/inputs/constants';
import { inputsActions } from '../../store/inputs';

import { ModalInspectQuery } from './modal';
import * as i18n from './translations';

interface OwnProps {
  queryId: string;
  inspectIndex: number;
  title: string | React.ReactElement | React.ReactNode;
}

interface InspectButtonReducer {
  id: string;
  isInspected: boolean;
  loading: boolean;
  inspect: inputsModel.InspectQuery | null;
  selectedInspectIndex: number;
}

interface InspectButtonDispatch {
  setIsInspected: ActionCreator<{
    id: string;
    inputId: InputsModelId;
    isInspected: boolean;
    selectedInspectIndex: number;
  }>;
}

type InspectButtonProps = OwnProps & InspectButtonReducer & InspectButtonDispatch;

const InspectButtonComponent = ({
  inspect,
  isInspected,
  loading,
  inspectIndex = 0,
  queryId = '',
  selectedInspectIndex,
  setIsInspected,
  title = '',
}: InspectButtonProps) => (
  <>
    <EuiToolTip delay="regular" position="top" content={i18n.TOOLTIP_CONTENT}>
      {loading ? (
        <EuiLoadingSpinner size="m" />
      ) : (
        <EuiButtonIcon
          iconSize="m"
          iconType="inspect"
          onClick={() => {
            setIsInspected({
              id: queryId,
              inputId: 'global',
              isInspected: true,
              selectedInspectIndex: inspectIndex,
            });
          }}
        />
      )}
    </EuiToolTip>
    <ModalInspectQuery
      closeModal={() => {
        setIsInspected({
          id: queryId,
          inputId: 'global',
          isInspected: false,
          selectedInspectIndex: inspectIndex,
        });
      }}
      isShowing={!loading && selectedInspectIndex === inspectIndex && isInspected}
      request={inspect != null && inspect.dsl.length > 0 ? inspect.dsl[inspectIndex] : null}
      response={
        inspect != null && inspect.response.length > 0 ? inspect.response[inspectIndex] : null
      }
      title={title}
    />
  </>
);

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
