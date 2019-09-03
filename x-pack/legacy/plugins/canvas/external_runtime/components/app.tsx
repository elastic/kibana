/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
// @ts-ignore Untyped package
import { RenderFunctionsRegistry } from 'data/interpreter';
import { Canvas } from './canvas.container';
import { initialExternalEmbedState, ExternalEmbedStateProvider } from '../context';
// @ts-ignore Untyped local
import { renderFunctions } from '../../canvas_plugin_src/renderers';
import { CanvasRenderedWorkpad, ExternalEmbedState, Stage } from '../types';

interface Props {
  stage: Stage;
  workpad: CanvasRenderedWorkpad;
}

/**
 * The overall Embedded Workpad app; the highest-layer component.
 */
export const App = (props: Props) => {
  const { workpad, stage } = props;

  // Register all of the rendering experessions with a bespoke registry.
  const renderersRegistry = new RenderFunctionsRegistry();

  renderFunctions.forEach((fn: Function | undefined) => {
    if (fn) {
      renderersRegistry.register(fn);
    }
  });

  const initialState: ExternalEmbedState = {
    ...initialExternalEmbedState,
    stage,
    renderersRegistry,
    workpad,
  };

  return (
    <ExternalEmbedStateProvider initialState={initialState}>
      <Canvas />
    </ExternalEmbedStateProvider>
  );
};
