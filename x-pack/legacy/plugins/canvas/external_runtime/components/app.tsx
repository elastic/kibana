/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { CanvasRenderedWorkpad, ExternalEmbedState, Stage } from '../types';
import { RendererSpec } from '../../types';
import { initialExternalEmbedState, ExternalEmbedStateProvider } from '../context';
import { Canvas } from './canvas.container';
import { renderFunctions } from '../supported_renderers';

interface Props {
  stage: Stage;
  workpad: CanvasRenderedWorkpad;
}

/**
 * The overall Embedded Workpad app; the highest-layer component.
 */
export const App = (props: Props) => {
  const { workpad, stage } = props;

  const renderers: { [key: string]: RendererSpec } = {};

  renderFunctions.forEach(fn => {
    const func = fn();
    renderers[func.name] = func;
  });

  const initialState: ExternalEmbedState = {
    ...initialExternalEmbedState,
    stage,
    renderers,
    workpad,
  };

  return (
    <ExternalEmbedStateProvider initialState={initialState}>
      <Canvas />
    </ExternalEmbedStateProvider>
  );
};
