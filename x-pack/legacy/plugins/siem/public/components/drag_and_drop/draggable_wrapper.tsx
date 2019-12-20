/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash/fp';
import React, { createContext, useContext, useEffect } from 'react';
import {
  Draggable,
  DraggableProvided,
  DraggableStateSnapshot,
  Droppable,
} from 'react-beautiful-dnd';
import { connect } from 'react-redux';
import styled, { css } from 'styled-components';
import { ActionCreator } from 'typescript-fsa';

import { EuiPortal } from '@elastic/eui';
import { dragAndDropActions } from '../../store/drag_and_drop';
import { DataProvider } from '../timeline/data_providers/data_provider';
import { STATEFUL_EVENT_CSS_CLASS_NAME } from '../timeline/helpers';
import { TruncatableText } from '../truncatable_text';
import { getDraggableId, getDroppableId } from './helpers';

// As right now, we do not know what we want there, we will keep it as a placeholder
export const DragEffects = styled.div``;

DragEffects.displayName = 'DragEffects';

export const DraggablePortalContext = createContext<boolean>(false);
export const useDraggablePortalContext = () => useContext(DraggablePortalContext);

const Wrapper = styled.div`
  display: inline-block;
  max-width: 100%;

  [data-rbd-placeholder-context-id] {
    display: none !important;
  }
`;

Wrapper.displayName = 'Wrapper';

const ProviderContainer = styled.div<{ isDragging: boolean }>`
  &,
  &::before,
  &::after {
    transition: background ${({ theme }) => theme.eui.euiAnimSpeedFast} ease,
      color ${({ theme }) => theme.eui.euiAnimSpeedFast} ease;
  }

  ${({ isDragging }) =>
    !isDragging &&
    css`
      & {
        border-radius: 2px;
        padding: 0 4px 0 8px;
        position: relative;
        z-index: ${({ theme }) => theme.eui.euiZLevel0} !important;

        &::before {
          background-image: linear-gradient(
              135deg,
              ${({ theme }) => theme.eui.euiColorMediumShade} 25%,
              transparent 25%
            ),
            linear-gradient(
              -135deg,
              ${({ theme }) => theme.eui.euiColorMediumShade} 25%,
              transparent 25%
            ),
            linear-gradient(
              135deg,
              transparent 75%,
              ${({ theme }) => theme.eui.euiColorMediumShade} 75%
            ),
            linear-gradient(
              -135deg,
              transparent 75%,
              ${({ theme }) => theme.eui.euiColorMediumShade} 75%
            );
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

      &:hover {
        &,
        & .euiBadge,
        & .euiBadge__text {
          cursor: move; /* Fallback for IE11 */
          cursor: grab;
        }
      }

      .${STATEFUL_EVENT_CSS_CLASS_NAME}:hover &,
      tr:hover & {
        background-color: ${({ theme }) => theme.eui.euiColorLightShade};

        &::before {
          background-image: linear-gradient(
              135deg,
              ${({ theme }) => theme.eui.euiColorDarkShade} 25%,
              transparent 25%
            ),
            linear-gradient(
              -135deg,
              ${({ theme }) => theme.eui.euiColorDarkShade} 25%,
              transparent 25%
            ),
            linear-gradient(
              135deg,
              transparent 75%,
              ${({ theme }) => theme.eui.euiColorDarkShade} 75%
            ),
            linear-gradient(
              -135deg,
              transparent 75%,
              ${({ theme }) => theme.eui.euiColorDarkShade} 75%
            );
        }
      }

      &:hover,
      &:focus,
      .${STATEFUL_EVENT_CSS_CLASS_NAME}:hover &:hover,
      .${STATEFUL_EVENT_CSS_CLASS_NAME}:focus &:focus,
      tr:hover &:hover,
      tr:hover &:focus {
        background-color: ${({ theme }) => theme.eui.euiColorPrimary};

        &,
        & a,
        & a:hover {
          color: ${({ theme }) => theme.eui.euiColorEmptyShade};
        }

        &::before {
          background-image: linear-gradient(
              135deg,
              ${({ theme }) => theme.eui.euiColorEmptyShade} 25%,
              transparent 25%
            ),
            linear-gradient(
              -135deg,
              ${({ theme }) => theme.eui.euiColorEmptyShade} 25%,
              transparent 25%
            ),
            linear-gradient(
              135deg,
              transparent 75%,
              ${({ theme }) => theme.eui.euiColorEmptyShade} 75%
            ),
            linear-gradient(
              -135deg,
              transparent 75%,
              ${({ theme }) => theme.eui.euiColorEmptyShade} 75%
            );
        }
      }
    `}

  ${({ isDragging }) =>
    isDragging &&
    css`
      & {
        z-index: 9999 !important;
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
  truncate?: boolean;
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

const DraggableWrapperComponent = React.memo<Props>(
  ({ dataProvider, registerProvider, render, truncate, unRegisterProvider }) => {
    const usePortal = useDraggablePortalContext();

    useEffect(() => {
      registerProvider!({ provider: dataProvider });
      return () => {
        unRegisterProvider!({ id: dataProvider.id });
      };
    }, []);

    return (
      <Wrapper data-test-subj="draggableWrapperDiv">
        <Droppable isDropDisabled={true} droppableId={getDroppableId(dataProvider.id)}>
          {droppableProvided => (
            <div ref={droppableProvided.innerRef} {...droppableProvided.droppableProps}>
              <Draggable
                draggableId={getDraggableId(dataProvider.id)}
                index={0}
                key={getDraggableId(dataProvider.id)}
              >
                {(provided, snapshot) => (
                  <ConditionalPortal usePortal={snapshot.isDragging && usePortal}>
                    <ProviderContainer
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      ref={provided.innerRef}
                      data-test-subj="providerContainer"
                      isDragging={snapshot.isDragging}
                      style={{
                        ...provided.draggableProps.style,
                      }}
                    >
                      {truncate && !snapshot.isDragging ? (
                        <TruncatableText data-test-subj="draggable-truncatable-content">
                          {render(dataProvider, provided, snapshot)}
                        </TruncatableText>
                      ) : (
                        <span data-test-subj={`draggable-content-${dataProvider.queryMatch.field}`}>
                          {render(dataProvider, provided, snapshot)}
                        </span>
                      )}
                    </ProviderContainer>
                  </ConditionalPortal>
                )}
              </Draggable>
              {droppableProvided.placeholder}
            </div>
          )}
        </Droppable>
      </Wrapper>
    );
  },
  (prevProps, nextProps) => {
    return (
      isEqual(prevProps.dataProvider, nextProps.dataProvider) &&
      prevProps.render !== nextProps.render &&
      prevProps.truncate === nextProps.truncate
    );
  }
);

DraggableWrapperComponent.displayName = 'DraggableWrapperComponent';

export const DraggableWrapper = connect(null, {
  registerProvider: dragAndDropActions.registerProvider,
  unRegisterProvider: dragAndDropActions.unRegisterProvider,
})(DraggableWrapperComponent);

DraggableWrapper.displayName = 'DraggableWrapper';

/**
 * Conditionally wraps children in an EuiPortal to ensure drag offsets are correct when dragging
 * from containers that have css transforms
 *
 * See: https://github.com/atlassian/react-beautiful-dnd/issues/499
 */
const ConditionalPortal = React.memo<{ children: React.ReactNode; usePortal: boolean }>(
  ({ children, usePortal }) => (usePortal ? <EuiPortal>{children}</EuiPortal> : <>{children}</>)
);

ConditionalPortal.displayName = 'ConditionalPortal';
