/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash/fp';
import { EuiText } from '@elastic/eui';
import * as React from 'react';
import {
  Draggable,
  DraggableProvided,
  DraggableStateSnapshot,
  Droppable,
} from 'react-beautiful-dnd';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { ActionCreator } from 'typescript-fsa';

import { dragAndDropActions } from '../../store/drag_and_drop';
import { DataProvider } from '../timeline/data_providers/data_provider';
import { TruncatableText } from '../truncatable_text';

import { getDraggableId, getDroppableId } from './helpers';

// As right now, we do not know what we want there, we will keep it as a placeholder
export const DragEffects = styled.div``;

DragEffects.displayName = 'DragEffects';

const ProviderContainer = styled.div`
  &:hover {
    transition: background-color 0.7s ease;
    background-color: ${props => props.theme.eui.euiColorLightShade};
  }
`;

ProviderContainer.displayName = 'ProviderContainer';

interface OwnProps {
  dataProvider: DataProvider;
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
      <div data-test-subj="draggableWrapperDiv">
        <Droppable isDropDisabled={true} droppableId={getDroppableId(dataProvider.id)}>
          {droppableProvided => (
            <div ref={droppableProvided.innerRef} {...droppableProvided.droppableProps}>
              <Draggable
                draggableId={getDraggableId(dataProvider.id)}
                index={0}
                key={dataProvider.id}
              >
                {(provided, snapshot) => (
                  <ProviderContainer
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    innerRef={provided.innerRef}
                    data-test-subj="providerContainer"
                    style={{
                      ...provided.draggableProps.style,
                      zIndex: 9000, // EuiFlyout has a z-index of 8000
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
                      <EuiText data-test-subj="draggable-content" size="s">
                        {render(dataProvider, provided, snapshot)}
                      </EuiText>
                    )}
                  </ProviderContainer>
                )}
              </Draggable>
              {droppableProvided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
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
