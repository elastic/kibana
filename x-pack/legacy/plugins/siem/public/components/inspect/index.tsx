/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';
import React, { useEffect, useState, useRef, memo } from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';
import styled from 'styled-components';

import { pure } from 'recompose';
import { inputsModel, inputsSelectors, State } from '../../store';
import { InputsModelId } from '../../store/inputs/constants';
import { inputsActions } from '../../store/inputs';

import { ModalInspectQuery } from './modal';
import * as i18n from './translations';

const InspectContainer = styled.div<{ showInspect: boolean }>`
  .euiButtonIcon {
    ${props => (props.showInspect ? 'opacity: 1;' : 'opacity: 0')}
    transition: opacity ${props => props.theme.eui.euiAnimSpeedNormal} ease;
  }
`;

interface OwnProps {
  queryId: string;
  inputId?: InputsModelId;
  inspectIndex: number;
  isDisabled: boolean;
  onCloseInspect?: () => void;
  show: boolean;
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

export const InspectButtonComponent = pure<InspectButtonProps>(
  ({
    inputId = 'global',
    inspect,
    isDisabled,
    isInspected,
    loading,
    inspectIndex = 0,
    onCloseInspect,
    queryId = '',
    selectedInspectIndex,
    setIsInspected,
    show,
    title = '',
  }: InspectButtonProps) => (
    <InspectContainer showInspect={show}>
      {inputId === 'timeline' && (
        <EuiButtonEmpty
          aria-label={i18n.TOOLTIP_CONTENT}
          data-test-subj="inspect-timeline"
          color="text"
          iconSide="left"
          iconType="inspect"
          isDisabled={loading || isDisabled}
          isLoading={loading}
          onClick={() => {
            setIsInspected({
              id: queryId,
              inputId,
              isInspected: true,
              selectedInspectIndex: inspectIndex,
            });
          }}
        >
          {i18n.TITLE}
        </EuiButtonEmpty>
      )}
      {inputId === 'global' && (
        <EuiButtonIcon
          aria-label={i18n.TOOLTIP_CONTENT}
          className={show ? '' : ''}
          iconSize="m"
          iconType="inspect"
          isDisabled={loading || isDisabled}
          title={i18n.TOOLTIP_CONTENT}
          onClick={() => {
            setIsInspected({
              id: queryId,
              inputId,
              isInspected: true,
              selectedInspectIndex: inspectIndex,
            });
          }}
          data-test-subj="inspect-open-modal"
        />
      )}
      <ModalInspectQuery
        closeModal={() => {
          if (onCloseInspect != null) {
            onCloseInspect();
          }
          setIsInspected({
            id: queryId,
            inputId,
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
        data-test-subj="inspect-modal"
      />
    </InspectContainer>
  )
);

const makeMapStateToProps = () => {
  const getGlobalQuery = inputsSelectors.globalQueryByIdSelector();
  const getTimelineQuery = inputsSelectors.timelineQueryByIdSelector();
  const mapStateToProps = (state: State, { inputId = 'global', queryId }: OwnProps) => {
    return inputId === 'global' ? getGlobalQuery(state, queryId) : getTimelineQuery(state, queryId);
  };
  return mapStateToProps;
};

export const InspectButton = connect(
  makeMapStateToProps,
  {
    setIsInspected: inputsActions.setInspectionParameter,
  }
)(InspectButtonComponent);
