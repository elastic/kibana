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
import { I18nProvider, FormattedMessage } from '@kbn/i18n/react';
import { HashRouter, Switch, Route, RouteComponentProps } from 'react-router-dom';
import { render, unmountComponentAtNode } from 'react-dom';
import { CoreSetup, CoreStart } from 'src/core/public';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { npStart } from 'ui/new_platform';
import { ExpressionsSetup } from 'src/plugins/expressions/public';
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
import { App } from './app';
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

        addHelpMenuToAppChrome(context.core.chrome);

        setReportManager(
          new LensReportManager({
            storage: new Storage(localStorage),
            http: core.http,
          })
        );

        const renderEditor = (routeProps: RouteComponentProps<{ id?: string }>) => {
          trackUiEvent('loaded');
          return (
            <App
              core={startParams.core}
              data={startParams.startDeps.data}
              visualizationMap={visualizationMap}
              datasourceMap={datasourceMap}
              dataShim={startParams.startDeps.dataShim}
              storage={new Storage(localStorage)}
              docId={routeProps.match.params.id}
              ExpressionRenderer={npStart.plugins.expressions.ExpressionRenderer}
              docStorage={new SavedObjectIndexStore(startParams.core.savedObjects.client)}
              redirectTo={id => {
                if (!id) {
                  routeProps.history.push('/lens');
                } else {
                  routeProps.history.push(`/lens/edit/${id}`);
                }
              }}
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
