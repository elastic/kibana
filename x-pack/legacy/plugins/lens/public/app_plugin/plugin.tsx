/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { I18nProvider, FormattedMessage } from '@kbn/i18n/react';
import { HashRouter, Switch, Route, RouteComponentProps } from 'react-router-dom';
import chrome, { Chrome } from 'ui/chrome';
import { localStorage } from 'ui/storage/storage_service';
import { QueryBar } from '../../../../../../src/legacy/core_plugins/data/public/query';
import { editorFrameSetup, editorFrameStop } from '../editor_frame_plugin';
import { indexPatternDatasourceSetup, indexPatternDatasourceStop } from '../indexpattern_plugin';
import { SavedObjectIndexStore } from '../persistence';
import { xyVisualizationSetup, xyVisualizationStop } from '../xy_visualization_plugin';
import {
  datatableVisualizationSetup,
  datatableVisualizationStop,
} from '../datatable_visualization_plugin';
import { App } from './app';
import { EditorFrameInstance } from '../types';

export class AppPlugin {
  private instance: EditorFrameInstance | null = null;
  private chrome: Chrome | null = null;

  constructor() {}

  setup() {
    // TODO: These plugins should not be called from the top level, but since this is the
    // entry point to the app we have no choice until the new platform is ready
    const indexPattern = indexPatternDatasourceSetup();
    const datatableVisualization = datatableVisualizationSetup();
    const xyVisualization = xyVisualizationSetup();
    const editorFrame = editorFrameSetup();

    editorFrame.registerDatasource('indexpattern', indexPattern);
    editorFrame.registerVisualization(xyVisualization);
    editorFrame.registerVisualization(datatableVisualization);

    this.chrome = chrome;
    const store = new SavedObjectIndexStore(this.chrome!.getSavedObjectsClient());

    this.instance = editorFrame.createInstance({});

    const renderEditor = (routeProps: RouteComponentProps<{ id?: string }>) => {
      return (
        <App
          editorFrame={this.instance!}
          QueryBar={QueryBar}
          chrome={chrome}
          store={localStorage}
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
    if (this.instance) {
      this.instance.unmount();
    }

    // TODO this will be handled by the plugin platform itself
    indexPatternDatasourceStop();
    xyVisualizationStop();
    datatableVisualizationStop();
    editorFrameStop();
  }
}

const app = new AppPlugin();

export const appSetup = () => app.setup();
export const appStop = () => app.stop();
