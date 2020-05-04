/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { UiActionsStart } from '../../../../../../../src/plugins/ui_actions/public';
import { createHelloWorldAction } from '../../../../../../../src/plugins/ui_actions/public/tests/test_samples';

import {
  Start as InspectorStartContract,
  Setup as InspectorSetupContract,
} from '../../../../../../../src/plugins/inspector/public';

import { CONTEXT_MENU_TRIGGER } from './embeddable_api';

const REACT_ROOT_ID = 'embeddableExplorerRoot';

import { SayHelloAction, createSendMessageAction } from './embeddable_api';
import { App } from './app';
import {
  EmbeddableStart,
  EmbeddableSetup,
} from '.../../../../../../../src/plugins/embeddable/public';

export interface SetupDependencies {
  embeddable: EmbeddableSetup;
  inspector: InspectorSetupContract;
  __LEGACY: {
    ExitFullScreenButton: React.ComponentType<any>;
  };
}

interface StartDependencies {
  embeddable: EmbeddableStart;
  uiActions: UiActionsStart;
  inspector: InspectorStartContract;
  __LEGACY: {
    ExitFullScreenButton: React.ComponentType<any>;
    onRenderComplete: (onRenderComplete: () => void) => void;
  };
}

export type EmbeddableExplorerSetup = void;
export type EmbeddableExplorerStart = void;

export class EmbeddableExplorerPublicPlugin
  implements
    Plugin<EmbeddableExplorerSetup, EmbeddableExplorerStart, SetupDependencies, StartDependencies> {
  public setup(core: CoreSetup, setupDeps: SetupDependencies): EmbeddableExplorerSetup {}

  public start(core: CoreStart, plugins: StartDependencies): EmbeddableExplorerStart {
    const helloWorldAction = createHelloWorldAction(core.overlays);
    const sayHelloAction = new SayHelloAction(alert);
    const sendMessageAction = createSendMessageAction(core.overlays);

    plugins.uiActions.registerAction(sayHelloAction);
    plugins.uiActions.registerAction(sendMessageAction);

    plugins.uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, helloWorldAction);

    plugins.__LEGACY.onRenderComplete(() => {
      const root = document.getElementById(REACT_ROOT_ID);
      ReactDOM.render(<App embeddableServices={plugins.embeddable} />, root);
    });
  }

  public stop() {}
}
