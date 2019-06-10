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
import { embeddableFactories, IRegistry, EmbeddableFactory } from 'plugins/embeddable_api';

import 'ui/autoload/all';
import 'uiExports/embeddableActions';
import 'uiExports/embeddableFactories';

import uiRoutes from 'ui/routes';

// @ts-ignore
import { uiModules } from 'ui/modules';
import template from './index.html';

export interface PluginShim {
  embeddableAPI: {
    embeddableFactories: IRegistry<EmbeddableFactory>;
  };
}

export interface CoreShim {
  onRenderComplete: (listener: () => void) => void;
}

const pluginShim: PluginShim = {
  embeddableAPI: {
    embeddableFactories,
  },
};

let rendered = false;
const onRenderCompleteListeners: Array<() => void> = [];
const coreShim: CoreShim = {
  onRenderComplete: (renderCompleteListener: () => void) => {
    if (rendered) {
      renderCompleteListener();
    } else {
      onRenderCompleteListeners.push(renderCompleteListener);
    }
  },
};

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

export function createShim(): { core: CoreShim; plugins: PluginShim } {
  return {
    core: coreShim,
    plugins: pluginShim,
  };
}
