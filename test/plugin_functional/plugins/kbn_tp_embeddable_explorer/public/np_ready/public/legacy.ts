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
/* eslint-disable @kbn/eslint/no-restricted-paths */
import 'ui/autoload/all';

import 'uiExports/interpreter';
import 'uiExports/embeddableFactories';
import 'uiExports/embeddableActions';

import { npSetup, npStart } from 'ui/new_platform';
import { ExitFullScreenButton } from 'ui/exit_full_screen';
import uiRoutes from 'ui/routes';
// @ts-ignore
import { uiModules } from 'ui/modules';
/* eslint-enable @kbn/eslint/no-restricted-paths */

import template from './index.html';

import { plugin } from '.';

const pluginInstance = plugin({} as any);

export const setup = pluginInstance.setup(npSetup.core, {
  embeddable: npSetup.plugins.embeddable,
  inspector: npSetup.plugins.inspector,
  __LEGACY: {
    ExitFullScreenButton,
  },
});

let rendered = false;
const onRenderCompleteListeners: Array<() => void> = [];

uiRoutes.enable();
uiRoutes.defaults(/\embeddable_explorer/, {});
uiRoutes.when('/', {
  template,
  controller($scope) {
    $scope.$$postDigest(() => {
      rendered = true;
      onRenderCompleteListeners.forEach(listener => listener());
    });
  },
});

export const start = pluginInstance.start(npStart.core, {
  embeddable: npStart.plugins.embeddable,
  inspector: npStart.plugins.inspector,
  uiActions: npStart.plugins.uiActions,
  __LEGACY: {
    ExitFullScreenButton,
    onRenderComplete: (renderCompleteListener: () => void) => {
      if (rendered) {
        renderCompleteListener();
      } else {
        onRenderCompleteListeners.push(renderCompleteListener);
      }
    },
  },
});
