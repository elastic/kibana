/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  Draggable,
  DraggableProvided,
  DraggableStateSnapshot,
  Droppable,
} from 'react-beautiful-dnd';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import deepEqual from 'fast-deep-equal';

import { EuiPortal } from '@elastic/eui';
import { dragAndDropActions } from '../../store/drag_and_drop';
import { DataProvider } from '../timeline/data_providers/data_provider';
import { TruncatableText } from '../truncatable_text';
import { getDraggableId, getDroppableId } from './helpers';
import { ProviderContainer } from './provider_container';

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

const ProviderContentWrapper = styled.span`
  > span.euiToolTipAnchor {
    display: block; /* allow EuiTooltip content to be truncatable */
  }
`;

type RenderFunctionProp = (
  props: DataProvider,
  provided: DraggableProvided,
  state: DraggableStateSnapshot
) => React.ReactNode;

interface OwnProps {
  dataProvider: DataProvider;
  inline?: boolean;
  render: RenderFunctionProp;
  truncate?: boolean;
}

type Props = OwnProps;

/**
 * Wraps a draggable component to handle registration / unregistration of the
 * data provider associated with the item being dropped
 */

export const DraggableWrapper = React.memo<Props>(
  ({ dataProvider, render, truncate }) => {
    const [providerRegistered, setProviderRegistered] = useState(false);
    const dispatch = useDispatch();
    const usePortal = useDraggablePortalContext();

    const registerProvider = useCallback(() => {
      if (!providerRegistered) {
        dispatch(dragAndDropActions.registerProvider({ provider: dataProvider }));
        setProviderRegistered(true);
      }
    }, [dispatch, providerRegistered, dataProvider]);

    const unRegisterProvider = useCallback(
      () => dispatch(dragAndDropActions.unRegisterProvider({ id: dataProvider.id })),
      [dispatch, dataProvider]
    );

    useEffect(
      () => () => {
        unRegisterProvider();
      },
      []
    );

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
                  <ConditionalPortal
                    isDragging={snapshot.isDragging}
                    registerProvider={registerProvider}
                    usePortal={snapshot.isDragging && usePortal}
                  >
                    <ProviderContainer
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      ref={provided.innerRef}
                      data-test-subj="providerContainer"
                      isDragging={snapshot.isDragging}
                      registerProvider={registerProvider}
                      style={{
                        ...provided.draggableProps.style,
                      }}
                    >
                      {truncate && !snapshot.isDragging ? (
                        <TruncatableText data-test-subj="draggable-truncatable-content">
                          {render(dataProvider, provided, snapshot)}
                        </TruncatableText>
                      ) : (
                        <ProviderContentWrapper
                          data-test-subj={`draggable-content-${dataProvider.queryMatch.field}`}
                        >
                          {render(dataProvider, provided, snapshot)}
                        </ProviderContentWrapper>
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
  (prevProps, nextProps) =>
    deepEqual(prevProps.dataProvider, nextProps.dataProvider) &&
    prevProps.render !== nextProps.render &&
    prevProps.truncate === nextProps.truncate
);

DraggableWrapper.displayName = 'DraggableWrapper';

/**
 * Conditionally wraps children in an EuiPortal to ensure drag offsets are correct when dragging
 * from containers that have css transforms
 *
 * See: https://github.com/atlassian/react-beautiful-dnd/issues/499
 */

interface ConditionalPortalProps {
  children: React.ReactNode;
  usePortal: boolean;
  isDragging: boolean;
  registerProvider: () => void;
}

export const ConditionalPortal = React.memo<ConditionalPortalProps>(
  ({ children, usePortal, registerProvider, isDragging }) => {
    useEffect(() => {
      if (isDragging) {
        registerProvider();
      }
    }, [isDragging, registerProvider]);

    return usePortal ? <EuiPortal>{children}</EuiPortal> : <>{children}</>;
  }
);

ConditionalPortal.displayName = 'ConditionalPortal';
