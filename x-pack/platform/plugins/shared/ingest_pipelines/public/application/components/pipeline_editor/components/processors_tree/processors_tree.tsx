/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, memo, useRef, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, keys } from '@elastic/eui';
import List from 'react-virtualized/dist/commonjs/List';
import WindowScroller from 'react-virtualized/dist/commonjs/WindowScroller';

import { DropSpecialLocations } from '../../constants';
import { ProcessorInternal, ProcessorSelector } from '../../types';
import { selectorToDataTestSubject } from '../../utils';
import { AddProcessorButton } from '../add_processor_button';

import { PrivateTree, DropZoneButton } from './components';

import './processors_tree.scss';

export interface ProcessorInfo {
  id: string;
  selector: ProcessorSelector;
  aboveId?: string;
  belowId?: string;
}

export type Action =
  | { type: 'move'; payload: { source: ProcessorSelector; destination: ProcessorSelector } }
  | { type: 'selectToMove'; payload: { info: ProcessorInfo } }
  | { type: 'cancelMove' }
  | { type: 'addProcessor'; payload: { target: ProcessorSelector } };

export type OnActionHandler = (action: Action) => void;

export interface Props {
  processors: ProcessorInternal[];
  baseSelector: ProcessorSelector;
  onAction: OnActionHandler;
  movingProcessor?: ProcessorInfo;
  'data-test-subj'?: string;
}

/**
 * This component is the public interface to our optimised tree rendering private components and
 * also contains top-level state concerns for an instance of the component
 */
export const ProcessorsTree: FunctionComponent<Props> = memo((props) => {
  const { processors, baseSelector, onAction, movingProcessor } = props;
  // These refs are created here so they can be shared with all
  // recursively rendered trees. Their values should come from react-virtualized
  // List component and WindowScroller component.
  const windowScrollerRef = useRef<WindowScroller>(null);
  const listRef = useRef<List>(null);

  useEffect(() => {
    const cancelMoveKbListener = (event: KeyboardEvent) => {
      // x-browser support per https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/keyCode
      if (event.key === keys.ESCAPE || event.code === 'Escape') {
        onAction({ type: 'cancelMove' });
      }
    };
    const cancelMoveClickListener = () => {
      onAction({ type: 'cancelMove' });
    };
    // Give the browser a chance to flush any click events including the click
    // event that triggered any state transition into selecting a processor to move
    setTimeout(() => {
      if (movingProcessor) {
        window.addEventListener('keyup', cancelMoveKbListener);
        window.addEventListener('click', cancelMoveClickListener);
      } else {
        window.removeEventListener('keyup', cancelMoveKbListener);
        window.removeEventListener('click', cancelMoveClickListener);
      }
    });
    return () => {
      window.removeEventListener('keyup', cancelMoveKbListener);
      window.removeEventListener('click', cancelMoveClickListener);
    };
  }, [movingProcessor, onAction]);

  return (
    <EuiFlexGroup
      data-test-subj={props['data-test-subj']}
      direction="column"
      gutterSize="none"
      responsive={false}
      className="pipelineProcessorsEditor__tree__container"
    >
      <EuiFlexItem grow={false}>
        <PrivateTree
          windowScrollerRef={windowScrollerRef}
          listRef={listRef}
          level={1}
          onAction={onAction}
          movingProcessor={movingProcessor}
          processors={processors}
          selector={baseSelector}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          data-test-subj={selectorToDataTestSubject(baseSelector)}
          responsive={false}
          alignItems="flexStart"
          gutterSize="none"
          direction="column"
        >
          {!processors.length && (
            // We want to make this dropzone the max length of its container
            <EuiFlexItem style={{ width: '100%' }}>
              <DropZoneButton
                data-test-subj="dropButtonEmptyTree"
                isVisible={Boolean(movingProcessor)}
                isDisabled={false}
                onClick={(event) => {
                  event.preventDefault();
                  onAction({
                    type: 'move',
                    payload: {
                      destination: baseSelector.concat(DropSpecialLocations.top),
                      source: movingProcessor!.selector,
                    },
                  });
                }}
              />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <AddProcessorButton
              onClick={() => {
                onAction({ type: 'addProcessor', payload: { target: baseSelector } });
              }}
              renderButtonAsLink
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
