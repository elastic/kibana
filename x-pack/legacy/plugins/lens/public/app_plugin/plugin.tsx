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
import chrome from 'ui/chrome';
import { CoreSetup, CoreStart } from 'src/core/public';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { DataStart } from '../../../../../../src/legacy/core_plugins/data/public';
import { Storage } from '../../../../../../src/plugins/kibana_utils/public';
import { editorFrameSetup, editorFrameStart, editorFrameStop } from '../editor_frame_plugin';
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
import { EditorFrameInstance } from '../types';
import {
  LensReportManager,
  setReportManager,
  stopReportManager,
  trackUiEvent,
} from '../lens_ui_telemetry';
import { LocalApplicationService } from '../../../../../../src/legacy/core_plugins/kibana/public/local_application_service';

export interface LensPluginStartDependencies {
  data: DataPublicPluginStart;
  dataShim: DataStart;
  __LEGACY: {
    localApplicationService: LocalApplicationService;
  };
}
export class AppPlugin {
  private instance: EditorFrameInstance | null = null;
  private store: SavedObjectIndexStore | null = null;

  constructor() {}

  setup(core: CoreSetup, plugins: {}) {
    // TODO: These plugins should not be called from the top level, but since this is the
    // entry point to the app we have no choice until the new platform is ready
    const indexPattern = indexPatternDatasourceSetup();
    const datatableVisualization = datatableVisualizationSetup();
    const xyVisualization = xyVisualizationSetup();
    const metricVisualization = metricVisualizationSetup();
    const editorFrameSetupInterface = editorFrameSetup();
    this.store = new SavedObjectIndexStore(chrome!.getSavedObjectsClient());

    editorFrameSetupInterface.registerVisualization(xyVisualization);
    editorFrameSetupInterface.registerVisualization(datatableVisualization);
    editorFrameSetupInterface.registerVisualization(metricVisualization);
    editorFrameSetupInterface.registerDatasource('indexpattern', indexPattern);
  }

  start(
    core: CoreStart,
    { data, dataShim, __LEGACY: { localApplicationService } }: LensPluginStartDependencies
  ) {
    if (this.store === null) {
      throw new Error('Start lifecycle called before setup lifecycle');
    }

    addHelpMenuToAppChrome(core.chrome);

    const store = this.store;

    const editorFrameStartInterface = editorFrameStart();

    this.instance = editorFrameStartInterface.createInstance({});

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
          core={core}
          data={data}
          dataShim={dataShim}
          editorFrame={this.instance!}
          storage={new Storage(localStorage)}
          docId={routeProps.match.params.id}
          docStorage={store}
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

    localApplicationService.register({
      id: 'lens',
      title: 'Lens',
      mount: async (context, params) => {
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

  stop() {
    if (this.instance) {
      this.instance.unmount();
    }

    stopReportManager();

    // TODO this will be handled by the plugin platform itself
    indexPatternDatasourceStop();
    xyVisualizationStop();
    metricVisualizationStop();
    datatableVisualizationStop();
    editorFrameStop();
  }
}
