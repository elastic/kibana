/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';
import { getOr } from 'lodash/fp';
import React, { useCallback } from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';
import styled, { css } from 'styled-components';

import { inputsModel, inputsSelectors, State } from '../../store';
import { InputsModelId } from '../../store/inputs/constants';
import { inputsActions } from '../../store/inputs';

import { ModalInspectQuery } from './modal';
import * as i18n from './translations';

export const BUTTON_CLASS = 'inspectButtonComponent';

export const InspectButtonContainer = styled.div<{ show?: boolean }>`
  display: flex;
  flex-grow: 1;

  > * {
    max-width: 100%;
  }

  .${BUTTON_CLASS} {
    pointer-events: none;
    opacity: 0;
    transition: opacity ${props => getOr(250, 'theme.eui.euiAnimSpeedNormal', props)} ease;
  }

  ${({ show }) =>
    show &&
    css`
      &:hover .${BUTTON_CLASS} {
        pointer-events: auto;
        opacity: 1;
      }
    `}
`;

InspectButtonContainer.displayName = 'InspectButtonContainer';

InspectButtonContainer.defaultProps = {
  show: true,
};

interface OwnProps {
  compact?: boolean;
  queryId: string;
  inputId?: InputsModelId;
  inspectIndex?: number;
  isDisabled?: boolean;
  onCloseInspect?: () => void;
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

const InspectButtonComponent: React.FC<InspectButtonProps> = ({
  compact = false,
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
  title = '',
}) => {
  const isShowingModal = !loading && selectedInspectIndex === inspectIndex && isInspected;
  const handleClick = useCallback(() => {
    setIsInspected({
      id: queryId,
      inputId,
      isInspected: true,
      selectedInspectIndex: inspectIndex,
    });
  }, [setIsInspected, queryId, inputId, inspectIndex]);

  const handleCloseModal = useCallback(() => {
    if (onCloseInspect != null) {
      onCloseInspect();
    }
    setIsInspected({
      id: queryId,
      inputId,
      isInspected: false,
      selectedInspectIndex: inspectIndex,
    });
  }, [onCloseInspect, setIsInspected, queryId, inputId, inspectIndex]);

  return (
    <>
      {inputId === 'timeline' && !compact && (
        <EuiButtonEmpty
          className={BUTTON_CLASS}
          aria-label={i18n.INSPECT}
          data-test-subj="inspect-empty-button"
          color="text"
          iconSide="left"
          iconType="inspect"
          isDisabled={loading || isDisabled}
          isLoading={loading}
          onClick={handleClick}
        >
          {i18n.INSPECT}
        </EuiButtonEmpty>
      )}
      {(inputId === 'global' || compact) && (
        <EuiButtonIcon
          className={BUTTON_CLASS}
          aria-label={i18n.INSPECT}
          data-test-subj="inspect-icon-button"
          iconSize="m"
          iconType="inspect"
          isDisabled={loading || isDisabled}
          title={i18n.INSPECT}
          onClick={handleClick}
        />
      )}
      <ModalInspectQuery
        closeModal={handleCloseModal}
        isShowing={isShowingModal}
        request={inspect != null && inspect.dsl.length > 0 ? inspect.dsl[inspectIndex] : null}
        response={
          inspect != null && inspect.response.length > 0 ? inspect.response[inspectIndex] : null
        }
        title={title}
        data-test-subj="inspect-modal"
      />
    </>
  );
};

const makeMapStateToProps = () => {
  const getGlobalQuery = inputsSelectors.globalQueryByIdSelector();
  const getTimelineQuery = inputsSelectors.timelineQueryByIdSelector();
  const mapStateToProps = (state: State, { inputId = 'global', queryId }: OwnProps) => {
    return inputId === 'global' ? getGlobalQuery(state, queryId) : getTimelineQuery(state, queryId);
  };
  return mapStateToProps;
};

const mapDispatchToProps = {
  setIsInspected: inputsActions.setInspectionParameter,
};

export const InspectButton = connect(
  makeMapStateToProps,
  mapDispatchToProps
)(React.memo(InspectButtonComponent));
