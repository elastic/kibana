/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
// @ts-ignore
import { RenderFunctionsRegistry } from 'data/interpreter';
import { Canvas } from './canvas';
import {
  initialExternalEmbedState,
  ExternalEmbedStateProvider,
  ExternalEmbedState,
} from '../context';
// @ts-ignore
import { renderFunctions } from '../../canvas_plugin_src/renderers';
import { CanvasWorkpad } from '../types';

interface Props {
  height: number;
  width: number;
  page: number;
  workpad: CanvasWorkpad;
}

export const App = (props: Props) => {
  const { workpad, page, height, width } = props;
  const renderersRegistry = new RenderFunctionsRegistry();
  renderFunctions.forEach((fn: Function) => renderersRegistry.register(fn));

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
