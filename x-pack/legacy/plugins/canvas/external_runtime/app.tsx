/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
// @ts-ignore
import { RenderFunctionsRegistry } from 'data/interpreter';
import { Embed } from './embed';
import { StateProvider } from './state';
// @ts-ignore
import { renderFunctions } from '../canvas_plugin_src/renderers';
import { CanvasWorkpad } from './types';

import '@elastic/eui/dist/eui_theme_light.css';
import '@kbn/ui-framework/dist/kui_light.css';
import '../../../../../built_assets/css/plugins/canvas/style/index.light.css';

const uiStyles = require.context(
  '../../../../../src/legacy/ui/public/styles',
  false,
  /[\/\\](?!mixins|variables|_|\.|bootstrap_(light|dark))[^\/\\]+\.less/
);
uiStyles.keys().forEach(key => uiStyles(key));

export interface State {
  workpad: CanvasWorkpad;
  page: number;
  height: number;
  width: number;
}

interface Props {
  height: number;
  width: number;
  page: number;
  workpad: CanvasWorkpad;
}

interface Action {
  type: string;
  [key: string]: any;
}

export const App = (props: Props) => {
  const { workpad, page, height, width } = props;
  const renderersRegistry = new RenderFunctionsRegistry();
  renderFunctions.forEach((fn: Function) => renderersRegistry.register(fn));

  const initialState = {
    renderersRegistry,
    workpad,
    page,
    height,
    width,
  };

  const reducer = (state: State, action: Action) => {
    switch (action.type) {
      case 'setWorkpad': {
        return {
          ...state,
          workpad: action.workpad,
        };
      }
      case 'setPage': {
        return {
          ...state,
          page: action.page,
        };
      }
      default: {
        return state;
      }
    }
  };

  return (
    <StateProvider initialState={initialState} reducer={reducer}>
      <Embed />
    </StateProvider>
  );
};
