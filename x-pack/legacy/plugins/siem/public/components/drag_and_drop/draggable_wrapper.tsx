/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash/fp';
import * as React from 'react';
import {
  Draggable,
  DraggableProvided,
  DraggableStateSnapshot,
  Droppable,
} from 'react-beautiful-dnd';
import { connect } from 'react-redux';
import styled, { css } from 'styled-components';
import { ActionCreator } from 'typescript-fsa';

import { dragAndDropActions } from '../../store/drag_and_drop';
import { DataProvider } from '../timeline/data_providers/data_provider';
import { TruncatableText } from '../truncatable_text';

import { getDraggableId, getDroppableId } from './helpers';

// As right now, we do not know what we want there, we will keep it as a placeholder
export const DragEffects = styled.div``;

DragEffects.displayName = 'DragEffects';

const Wrapper = styled.div`
  .euiPageBody & {
    display: inline-block;
  }
`;

Wrapper.displayName = 'Wrapper';

const ProviderContainer = styled.div<{ isDragging: boolean }>`
  ${({ theme, isDragging }) => css`
    // ALL DRAGGABLES

    &,
    &::before,
    &::after {
      transition: background ${theme.eui.euiAnimSpeedFast} ease,
        color ${theme.eui.euiAnimSpeedFast} ease;
    }

    // PAGE DRAGGABLES

    ${!isDragging &&
      `
      .euiPageBody & {
        border-radius: 2px;
        padding: 0 4px 0 8px;
        position: relative;
        z-index: ${theme.eui.euiZLevel0} !important;
        
        &::before {
          background-image: linear-gradient(
              135deg,
              ${theme.eui.euiColorMediumShade} 25%,
              transparent 25%
            ),
            linear-gradient(-135deg, ${theme.eui.euiColorMediumShade} 25%, transparent 25%),
            linear-gradient(135deg, transparent 75%, ${theme.eui.euiColorMediumShade} 75%),
            linear-gradient(-135deg, transparent 75%, ${theme.eui.euiColorMediumShade} 75%);
          background-position: 0 0, 1px 0, 1px -1px, 0px 1px;
          background-size: 2px 2px;
          bottom: 2px;
          content: '';
          display: block;
          left: 2px;
          position: absolute;
          top: 2px;
          width: 4px;
        }
      }

      .euiPageBody tr:hover & {
        background-color: ${theme.eui.euiColorLightShade};

        &::before {
          background-image: linear-gradient(
              135deg,
              ${theme.eui.euiColorDarkShade} 25%,
              transparent 25%
            ),
            linear-gradient(-135deg, ${theme.eui.euiColorDarkShade} 25%, transparent 25%),
            linear-gradient(135deg, transparent 75%, ${theme.eui.euiColorDarkShade} 75%),
            linear-gradient(-135deg, transparent 75%, ${theme.eui.euiColorDarkShade} 75%);
        }
      }

      .euiPageBody &:hover,
      .euiPageBody &:focus,
      .euiPageBody tr:hover &:hover,
      .euiPageBody tr:hover &:focus {
        background-color: ${theme.eui.euiColorPrimary};

        &,
        & a {
          color: ${theme.eui.euiColorEmptyShade};
        }

        &::before {
          background-image: linear-gradient(
              135deg,
              ${theme.eui.euiColorEmptyShade} 25%,
              transparent 25%
            ),
            linear-gradient(-135deg, ${theme.eui.euiColorEmptyShade} 25%, transparent 25%),
            linear-gradient(135deg, transparent 75%, ${theme.eui.euiColorEmptyShade} 75%),
            linear-gradient(-135deg, transparent 75%, ${theme.eui.euiColorEmptyShade} 75%);
        }
      }
    `}

    ${isDragging &&
      `
      .euiPageBody & {
        z-index: ${theme.eui.euiZLevel9} !important;
      `}

    // TIMELINE DRAGGABLES

    .timeline-flyout &:hover {
      background-color: ${theme.eui.euiColorLightShade};
    }
  `}
`;

ProviderContainer.displayName = 'ProviderContainer';

interface OwnProps {
  dataProvider: DataProvider;
  inline?: boolean;
  render: (
    props: DataProvider,
    provided: DraggableProvided,
    state: DraggableStateSnapshot
  ) => React.ReactNode;
  width?: string;
}

interface DispatchProps {
  registerProvider?: ActionCreator<{
    provider: DataProvider;
  }>;
  unRegisterProvider?: ActionCreator<{
    id: string;
  }>;
}

type Props = OwnProps & DispatchProps;

/**
 * Wraps a draggable component to handle registration / unregistration of the
 * data provider associated with the item being dropped
 */
class DraggableWrapperComponent extends React.Component<Props> {
  public shouldComponentUpdate = ({ dataProvider, render, width }: Props) =>
    isEqual(dataProvider, this.props.dataProvider) &&
    render !== this.props.render &&
    width === this.props.width
      ? false
      : true;

  public componentDidMount() {
    const { dataProvider, registerProvider } = this.props;

    registerProvider!({ provider: dataProvider });
  }

  public componentWillUnmount() {
    const { dataProvider, unRegisterProvider } = this.props;

    unRegisterProvider!({ id: dataProvider.id });
  }

  public render() {
    const { dataProvider, render, width } = this.props;

    return (
      <Wrapper data-test-subj="draggableWrapperDiv">
        <Droppable isDropDisabled={true} droppableId={getDroppableId(dataProvider.id)}>
          {droppableProvided => (
            <div ref={droppableProvided.innerRef} {...droppableProvided.droppableProps}>
              <Draggable
                draggableId={getDraggableId(dataProvider.id)}
                index={0}
                key={dataProvider.id}
              >
                {(provided, snapshot) => {
                  return (
                    <ProviderContainer
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      innerRef={provided.innerRef}
                      data-test-subj="providerContainer"
                      isDragging={snapshot.isDragging}
                      style={{
                        ...provided.draggableProps.style,
                      }}
                    >
                      {width != null && !snapshot.isDragging ? (
                        <TruncatableText
                          data-test-subj="draggable-truncatable-content"
                          size="s"
                          width={width}
                        >
                          {render(dataProvider, provided, snapshot)}
                        </TruncatableText>
                      ) : (
                        <span data-test-subj="draggable-content">
                          {render(dataProvider, provided, snapshot)}
                        </span>
                      )}
                    </ProviderContainer>
                  );
                }}
              </Draggable>
              {droppableProvided.placeholder}
            </div>
          )}
        </Droppable>
      </Wrapper>
    );
  }
}

export const DraggableWrapper = connect(
  null,
  {
    registerProvider: dragAndDropActions.registerProvider,
    unRegisterProvider: dragAndDropActions.unRegisterProvider,
  }
)(DraggableWrapperComponent);
