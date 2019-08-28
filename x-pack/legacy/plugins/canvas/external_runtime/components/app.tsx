/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
// @ts-ignore Untyped package
import { RenderFunctionsRegistry } from 'data/interpreter';
import { Canvas } from './canvas';
import {
  initialExternalEmbedState,
  ExternalEmbedStateProvider,
  ExternalEmbedState,
} from '../context';
// @ts-ignore Untyped local
import { renderFunctions } from '../../canvas_plugin_src/renderers';
import { CanvasRenderedWorkpad } from '../types';

interface Props {
  height: number;
  width: number;
  page: number;
  workpad: CanvasRenderedWorkpad;
}

/**
 * The overall Embedded Workpad app; the highest-layer component.
 */
export const App = (props: Props) => {
  const { workpad, page, height, width } = props;

  // Register all of the rendering experessions with a bespoke registry.
  const renderersRegistry = new RenderFunctionsRegistry();

  renderFunctions.forEach((fn: Function | undefined) => {
    if (fn) {
      renderersRegistry.register(fn);
    }
  });

  const initialState: ExternalEmbedState = {
    ...initialExternalEmbedState,
    height,
    page,
    renderersRegistry,
    width,
    workpad,
  };

  return (
    <ExternalEmbedStateProvider initialState={initialState}>
      <Canvas />
    </ExternalEmbedStateProvider>
  );
};
