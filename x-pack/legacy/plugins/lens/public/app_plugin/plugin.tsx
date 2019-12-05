/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'ui/autoload/all';
// Used to run esaggs queries
import 'uiExports/fieldFormats';
import 'uiExports/search';
import 'uiExports/visRequestHandlers';
import 'uiExports/visResponseHandlers';
// Used for kibana_context function
import 'uiExports/savedObjectTypes';

import React from 'react';
import { map } from 'rxjs/operators';
import { I18nProvider, FormattedMessage } from '@kbn/i18n/react';
import { HashRouter, Switch, Route, RouteComponentProps } from 'react-router-dom';
import { render, unmountComponentAtNode } from 'react-dom';
import { CoreSetup, CoreStart } from 'src/core/public';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { npStart } from 'ui/new_platform';
import { ExpressionsSetup } from 'src/plugins/expressions/public';
import { BehaviorSubject } from 'rxjs';
import { DataStart } from '../../../../../../src/legacy/core_plugins/data/public';
import { Storage } from '../../../../../../src/plugins/kibana_utils/public';
import { indexPatternDatasourceSetup, indexPatternDatasourceStop } from '../indexpattern_plugin';
import { addHelpMenuToAppChrome } from '../help_menu_util';
import { SavedObjectIndexStore } from '../persistence';
import { xyVisualizationSetup, xyVisualizationStop } from '../xy_visualization_plugin';
import { metricVisualizationSetup, metricVisualizationStop } from '../metric_visualization_plugin';
import {
  datatableVisualizationSetup,
  datatableVisualizationStop,
} from '../datatable_visualization_plugin';
import { App, Props } from './app';
import {
  LensReportManager,
  setReportManager,
  stopReportManager,
  trackUiEvent,
} from '../lens_ui_telemetry';
import { NOT_INTERNATIONALIZED_PRODUCT_NAME } from '../../common';
import { KibanaLegacySetup } from '../../../../../../src/plugins/kibana_legacy/public';
import { Visualization, Datasource } from '../types';
import { mergeTables } from './merge_tables';
import { createAppStateManager } from './app_state_manager';
import { observerComponent } from '../state_manager';
import { filterUpdater } from './filter_updater';
import { breadcrumbUpdater } from './breadcrumb_updater';
import { routeChangeLoader } from './route_change_loader';

export interface LensPluginSetupDependencies {
  kibana_legacy: KibanaLegacySetup;
  expressions: ExpressionsSetup;
}

export interface LensPluginStartDependencies {
  data: DataPublicPluginStart;
  dataShim: DataStart;
}

export class AppPlugin {
  private startParams?: {
    core: CoreStart;
    startDeps: LensPluginStartDependencies;
  };

  constructor() {}

  setup(core: CoreSetup, plugins: LensPluginSetupDependencies) {
    plugins.expressions.registerFunction(() => mergeTables);

    // TODO: These plugins should not be called from the top level, but since this is the
    // entry point to the app we have no choice until the new platform is ready
    const indexPattern = indexPatternDatasourceSetup();
    const datatableVisualization = datatableVisualizationSetup();
    const xyVisualization = xyVisualizationSetup();
    const metricVisualization = metricVisualizationSetup();
    const visualizationMap = lensPluginMap([
      xyVisualization,
      datatableVisualization,
      metricVisualization,
    ]) as Record<string, Visualization>;
    const datasourceMap = lensPluginMap([indexPattern]) as Record<string, Datasource>;

    plugins.kibana_legacy.registerLegacyApp({
      id: 'lens',
      title: NOT_INTERNATIONALIZED_PRODUCT_NAME,
      mount: async (context, params) => {
        const { startParams } = this;

        if (!startParams) {
          throw new Error('mounted before start phase');
        }

        // An observable stream that changes on route change
        const route$ = new BehaviorSubject<{ docId?: string; redirectTo: (id?: string) => void }>({
          redirectTo() {},
        });

        const currentRange = startParams.startDeps.data.query.timefilter.timefilter.getTime();
        const storage = new Storage(localStorage);
        const docStorage = new SavedObjectIndexStore(startParams.core.savedObjects.client);
        const stateManager = createAppStateManager({
          dateRange: { fromDate: currentRange.from, toDate: currentRange.to },
          language:
            storage.get('kibana.userQueryLanguage') || core.uiSettings.get('search:queryLanguage'),
        });

        // A list of effects that respond to observable changes.
        const subscriptions = [
          filterUpdater({
            filterManager: startParams.startDeps.data.query.filterManager,
            setState: stateManager.setState,
            trackDataEvent: trackUiEvent,
          }),
          breadcrumbUpdater({
            state$: stateManager.state$,
            http: startParams.core.http,
            chrome: startParams.core.chrome,
          }),
          routeChangeLoader({
            route$,
            docStorage,
            state$: stateManager.state$,
            setState: stateManager.setState,
            indexPatternsService: startParams.startDeps.data.indexPatterns.indexPatterns,
            notifications: startParams.core.notifications,
          }),
        ];

        const BoundApp = observerComponent<Omit<Props, 'state'>, Pick<Props, 'state'>>(
          stateManager.state$.pipe(map(state => ({ state }))),
          App
        );

        addHelpMenuToAppChrome(context.core.chrome);

        setReportManager(
          new LensReportManager({
            storage: new Storage(localStorage),
            http: core.http,
          })
        );

        const renderEditor = (routeProps: RouteComponentProps<{ id?: string }>) => {
          trackUiEvent('loaded');

          const redirectTo = (id?: string) => {
            if (!id) {
              routeProps.history.push('/lens');
            } else {
              routeProps.history.push(`/lens/edit/${id}`);
            }
          };

          route$.next({ docId: routeProps.match.params.id, redirectTo });

          return (
            <BoundApp
              stateManager={stateManager}
              core={startParams.core}
              data={startParams.startDeps.data}
              visualizationMap={visualizationMap}
              datasourceMap={datasourceMap}
              dataShim={startParams.startDeps.dataShim}
              storage={storage}
              ExpressionRenderer={npStart.plugins.expressions.ExpressionRenderer}
              docStorage={docStorage}
              redirectTo={redirectTo}
            />
          );
        };

        function NotFound() {
          trackUiEvent('loaded_404');
          return <FormattedMessage id="xpack.lens.app404" defaultMessage="404 Not Found" />;
        }
        render(
          <I18nProvider>
            <HashRouter>
              <Switch>
                <Route exact path="/lens/edit/:id" render={renderEditor} />
                <Route exact path="/lens" render={renderEditor} />
                <Route path="/lens" component={NotFound} />
              </Switch>
            </HashRouter>
          </I18nProvider>,
          params.element
        );
        return () => {
          subscriptions.forEach(s => s.unsubscribe());
          unmountComponentAtNode(params.element);
        };
      },
    });
  }

  start(core: CoreStart, startDeps: LensPluginStartDependencies) {
    this.startParams = { core, startDeps };
  }

  stop() {
    stopReportManager();

    // TODO this will be handled by the plugin platform itself
    indexPatternDatasourceStop();
    xyVisualizationStop();
    metricVisualizationStop();
    datatableVisualizationStop();
  }
}

function lensPluginMap<T extends { id: string }>(plugins: T[]) {
  return plugins.reduce((acc, v) => {
    acc[v.id] = v;
    return acc;
  }, {} as Record<string, T>);
}
