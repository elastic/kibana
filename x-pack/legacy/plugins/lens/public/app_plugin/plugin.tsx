/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { I18nProvider, FormattedMessage } from '@kbn/i18n/react';
import { HashRouter, Switch, Route, RouteComponentProps } from 'react-router-dom';
import chrome from 'ui/chrome';
import { Storage } from 'ui/storage';
import { indexPatternDatasourceSetup, indexPatternDatasourceStop } from '../indexpattern_plugin';
import { SavedObjectIndexStore } from '../persistence';
import { xyVisualizationSetup, xyVisualizationStop } from '../xy_visualization_plugin';
import { metricVisualizationSetup, metricVisualizationStop } from '../metric_visualization_plugin';
import {
  datatableVisualizationSetup,
  datatableVisualizationStop,
} from '../datatable_visualization_plugin';
import { App } from './app';
import { createRegistries } from '../state_management';
import { editorFrameSetup, editorFrameStop } from '../editor_frame_plugin';
import { Datasource, Visualization } from '../types';

export class AppPlugin {
  constructor() {}

  setup() {
    const plugins = editorFrameSetup();

    // TODO: These plugins should not be called from the top level, but since this is the
    // entry point to the app we have no choice until the new platform is ready
    const indexPattern = indexPatternDatasourceSetup();
    const datatableVisualization = datatableVisualizationSetup();
    const xyVisualization = xyVisualizationSetup();
    const metricVisualization = metricVisualizationSetup();
    const registries = createRegistries();
    const store = new SavedObjectIndexStore(chrome!.getSavedObjectsClient());

    registries.registerDatasource('indexpattern', indexPattern as Datasource<unknown, unknown>);
    registries.registerVisualization(xyVisualization as Visualization<unknown, unknown>);
    registries.registerVisualization(datatableVisualization as Visualization<unknown, unknown>);
    registries.registerVisualization(metricVisualization as Visualization<unknown, unknown>);

    const renderEditor = (routeProps: RouteComponentProps<{ id?: string }>) => {
      return (
        <App
          datasourceMap={registries.datasources}
          visualizationMap={registries.visualizations}
          expressionRenderer={plugins.data.expressions.ExpressionRenderer}
          chrome={chrome}
          store={new Storage(localStorage)}
          docId={routeProps.match.params.id}
          docStorage={store}
          redirectTo={id => {
            if (!id) {
              routeProps.history.push('/');
            } else {
              routeProps.history.push(`/edit/${id}`);
            }
          }}
        />
      );
    };

    function NotFound() {
      return <FormattedMessage id="xpack.lens.app404" defaultMessage="404 Not Found" />;
    }

    return (
      <I18nProvider>
        <HashRouter>
          <Switch>
            <Route exact path="/edit/:id" render={renderEditor} />
            <Route exact path="/" render={renderEditor} />
            <Route component={NotFound} />
          </Switch>
        </HashRouter>
      </I18nProvider>
    );
  }

  stop() {
    // TODO this will be handled by the plugin platform itself
    indexPatternDatasourceStop();
    xyVisualizationStop();
    metricVisualizationStop();
    datatableVisualizationStop();
    editorFrameStop();
  }
}

const app = new AppPlugin();

export const appSetup = () => app.setup();
export const appStop = () => app.stop();
