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
import { Plugin, CoreSetup, PluginInitializerContext } from 'kibana/public';
import { npStart } from 'ui/new_platform';
import uiRoutes from 'ui/routes';
import { IUiActionsApi } from '../../../../../src/plugins/ui_actions/public';
import { Start as IInspectorAPI } from '../../../../../src/plugins/inspector/public';
import {
  DashboardContainerFactory,
  DashboardContainer,
} from '../../../../../src/legacy/core_plugins/dashboard_embeddable_container/public/np_ready/public';
import {
  IEmbeddableSetupContract,
  EmbeddablePanel,
  EmbeddableInput,
} from '../../../../../src/plugins/embeddable/public';
import { DataPublicPluginSetup } from '../../../../../src/plugins/data/public';
// declare module 'kibana/public' {
//   interface AppMountContext {
//     search?: ISearchAppMountContext;
//     embeddable?: EmbeddableApi;
//     uiActions?: IUiActionsApi;
//     inspector?: IInspectorAPI;
//   }
// }

const REACT_ROOT_ID = 'embeddableExplorerRoot';

// declare module '../../../../../src/plugins/data/public' {
//   export interface IRequestTypesMap {
//     [EQL_SEARCH_STRATEGY]: I;
//   }

//   export interface IResponseTypesMap {
//     [EQL_SEARCH_STRATEGY]: IEsSearchResponse;
//   }
// }

interface EqlSearchSetupDependencies {
  data: DataPublicPluginSetup;
  embeddable: IEmbeddableSetupContract;
  __LEGACY: { onRenderComplete: (onRenderFn: () => void) => void; SavedObjectFinder: any };
  uiActions: IUiActionsApi;
  inspector: IInspectorAPI;
}

export class EqlSearchExplorerPlugin implements Plugin {
  constructor(private initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, dep: EqlSearchSetupDependencies) {
    dep.__LEGACY.onRenderComplete(() => {
      setTimeout(() => {
        const root = document.getElementById(REACT_ROOT_ID);
        const dashboardFactory = dep.embeddable!.getEmbeddableFactory(
          'dashboard'
        ) as DashboardContainerFactory;
        let input = { id: 'eql-dash', timeRange: { to: 'now', from: 'now-2y' } };
        const storedInput = window.localStorage.getItem('eqlDashboardInput');
        if (storedInput) {
          input = JSON.parse(storedInput);
        }
        dashboardFactory.create(input).then((dashboard: DashboardContainer) => {
          if (dashboard) {
            dashboard.getInput$().subscribe((changedInput: EmbeddableInput) => {
              window.localStorage.setItem('eqlDashboardInput', JSON.stringify(changedInput));
            });
            ReactDOM.render(
              <EmbeddablePanel
                embeddable={dashboard}
                getAllEmbeddableFactories={dep.embeddable!.getEmbeddableFactories}
                getEmbeddableFactory={dep.embeddable!.getEmbeddableFactory}
                getActions={dep.uiActions!.getTriggerCompatibleActions}
                {...dep.embeddable}
                overlays={npStart.core.overlays}
                notifications={core.notifications}
                inspector={dep.inspector!}
                SavedObjectFinder={dep.__LEGACY.SavedObjectFinder}
              />,
              root
            );
          }
        });
      }, 500);
    });
    // core.application.register({
    //   id: 'eqlSearchExplorer',
    //   title: 'Eql Search Explorer',
    //   async mount(context, params) {
    //     const { renderApp } = await import('./application');
    //     return renderApp(context, params);
    //   },
    // });
  }

  public start() {}
  public stop() {}
}
