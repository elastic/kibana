/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import deepEqual from 'react-fast-compare';
import { useDispatch, useSelector } from 'react-redux';
// @ts-expect-error unconverted component
import { elementLayer } from '../../state/actions/elements';
import { getSelectedPage, getNodes, getSelectedToplevelNodes } from '../../state/selectors/workpad';
// @ts-expect-error unconverted lib
import { flatten } from '../../lib/aeroelastic/functional';
import { layerHandlerCreators } from '../../lib/element_handler_creators';
// @ts-expect-error unconverted component
import { crawlTree } from '../workpad_page/integration_utils';
import { State } from '../../../types';
import { SidebarHeader as Component } from './sidebar_header.component';

const getSelectedNodes = (state: State, pageId: string): Array<string | undefined> => {
  const nodes = getNodes(state, pageId);
  const selectedToplevelNodes = getSelectedToplevelNodes(state);
  const selectedPrimaryShapeObjects = selectedToplevelNodes
    .map((id) => nodes.find((s) => s.id === id))
    .filter((shape) => shape);
  const selectedPersistentPrimaryNodes = flatten(
    selectedPrimaryShapeObjects.map((shape) =>
      nodes.find((n) => n.id === shape?.id) // is it a leaf or a persisted group?
        ? [shape?.id]
        : nodes.filter((s) => s.position?.parent === shape?.id).map((s) => s.id)
    )
  );
  const selectedNodeIds = flatten(selectedPersistentPrimaryNodes.map(crawlTree(nodes)));
  return selectedNodeIds.map((id: string) => nodes.find((s) => s.id === id));
};

const createHandlers = function <T>(
  handlers: Record<keyof T, (...args: any[]) => any>,
  context: Record<string, unknown>
) {
  return Object.keys(handlers).reduce<Record<keyof T, (...args: any[]) => any>>((acc, val) => {
    acc[val as keyof T] = handlers[val as keyof T](context);
    return acc;
  }, {} as Record<keyof T, (...args: any[]) => any>);
};

interface Props {
  title: string;
  showLayerControls?: boolean;
}

export const SidebarHeader: React.FC<Props> = (props) => {
  const pageId = useSelector<State, string>((state) => getSelectedPage(state));
  const selectedNodes = useSelector<State, Array<string | undefined>>(
    (state) => getSelectedNodes(state, pageId),
    deepEqual
  );

  const dispatch = useDispatch();

  const elementLayerDispatch = (selectedPageId: string, elementId: string, movement: number) => {
    dispatch(elementLayer({ pageId: selectedPageId, elementId, movement }));
  };

  const handlersContext = {
    ...props,
    pageId,
    selectedNodes,
    elementLayer: elementLayerDispatch,
  };

  const layerHandlers = createHandlers(layerHandlerCreators, handlersContext);

  return <Component {...props} {...layerHandlers} />;
};
