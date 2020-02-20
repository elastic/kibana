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
import { connect, ConnectedProps } from 'react-redux';
import styled from 'styled-components';

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

type Props = OwnProps & PropsFromRedux;

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
  (prevProps, nextProps) => {
    return (
      isEqual(prevProps.dataProvider, nextProps.dataProvider) &&
      prevProps.render !== nextProps.render &&
      prevProps.truncate === nextProps.truncate
    );
  }
);

DraggableWrapperComponent.displayName = 'DraggableWrapperComponent';

const mapDispatchToProps = {
  registerProvider: dragAndDropActions.registerProvider,
  unRegisterProvider: dragAndDropActions.unRegisterProvider,
};

const connector = connect(null, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const DraggableWrapper = connector(DraggableWrapperComponent);

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
