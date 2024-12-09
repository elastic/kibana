/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGraphPopover } from '../../..';
import type { ExpandButtonClickCallback, NodeProps } from '../types';
import { GraphNodeExpandPopover } from './graph_node_expand_popover';

interface UseGraphNodeExpandPopoverArgs {
  onExploreRelatedEntitiesClick: (node: NodeProps) => void;
  onShowActionsByEntityClick: (node: NodeProps) => void;
  onShowActionsOnEntityClick: (node: NodeProps) => void;
}

export const useGraphNodeExpandPopover = ({
  onExploreRelatedEntitiesClick,
  onShowActionsByEntityClick,
  onShowActionsOnEntityClick,
}: UseGraphNodeExpandPopoverArgs) => {
  const { id, state, actions } = useGraphPopover('node-expand-popover');
  const { openPopover, closePopover } = actions;

  const selectedNode = useRef<NodeProps | null>(null);
  const unToggleCallbackRef = useRef<(() => void) | null>(null);
  const [pendingOpen, setPendingOpen] = useState<{
    node: NodeProps;
    el: HTMLElement;
    unToggleCallback: () => void;
  } | null>(null);

  const closePopoverHandler = useCallback(() => {
    selectedNode.current = null;
    unToggleCallbackRef.current?.();
    unToggleCallbackRef.current = null;
    closePopover();
  }, [closePopover]);

  const onNodeExpandButtonClick: ExpandButtonClickCallback = useCallback(
    (e, node, unToggleCallback) => {
      // Close the current popover if open
      closePopoverHandler();

      if (selectedNode.current?.id !== node.id) {
        // Set the pending open state
        setPendingOpen({ node, el: e.currentTarget, unToggleCallback });
      }
    },
    [closePopoverHandler]
  );

  useEffect(() => {
    // Open pending popover if the popover is not open
    if (!state.isOpen && pendingOpen) {
      const { node, el, unToggleCallback } = pendingOpen;

      selectedNode.current = node;
      unToggleCallbackRef.current = unToggleCallback;
      openPopover(el);

      setPendingOpen(null);
    }
  }, [state.isOpen, pendingOpen, openPopover]);

  const PopoverComponent = memo(() => (
    <GraphNodeExpandPopover
      isOpen={state.isOpen}
      anchorElement={state.anchorElement}
      closePopover={closePopoverHandler}
      onExploreRelatedEntitiesClick={() => {
        onExploreRelatedEntitiesClick(selectedNode.current as NodeProps);
        closePopoverHandler();
      }}
      onShowActionsByEntityClick={() => {
        onShowActionsByEntityClick(selectedNode.current as NodeProps);
        closePopoverHandler();
      }}
      onShowActionsOnEntityClick={() => {
        onShowActionsOnEntityClick(selectedNode.current as NodeProps);
        closePopoverHandler();
      }}
    />
  ));

  PopoverComponent.displayName = GraphNodeExpandPopover.displayName;

  return useMemo(
    () => ({
      onNodeExpandButtonClick,
      PopoverComponent,
      id,
      actions: {
        ...actions,
        closePopover: closePopoverHandler,
      },
      state,
    }),
    [PopoverComponent, actions, closePopoverHandler, id, onNodeExpandButtonClick, state]
  );
};
