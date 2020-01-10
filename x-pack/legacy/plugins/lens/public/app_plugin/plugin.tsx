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
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { HashRouter, Route, RouteComponentProps, Switch } from 'react-router-dom';
import { render, unmountComponentAtNode } from 'react-dom';
import { CoreSetup, CoreStart, SavedObjectsClientContract } from 'src/core/public';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import rison, { RisonObject, RisonValue } from 'rison-node';
import { isObject } from 'lodash';
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
import {
  LensReportManager,
  setReportManager,
  stopReportManager,
  trackUiEvent,
} from '../lens_ui_telemetry';
import { NOT_INTERNATIONALIZED_PRODUCT_NAME } from '../../common';
import { KibanaLegacySetup } from '../../../../../../src/plugins/kibana_legacy/public';
import { EditorFrameStart } from '../types';
import {
  addEmbeddableToDashboardUrl,
  getUrlVars,
  getLensUrlFromDashboardAbsoluteUrl,
} from '../../../../../../src/legacy/core_plugins/kibana/public/dashboard/np_ready/url_helper';

export interface LensPluginSetupDependencies {
  kibana_legacy: KibanaLegacySetup;
}

export interface LensPluginStartDependencies {
  data: DataPublicPluginStart;
  dataShim: DataStart;
}

export const isRisonObject = (value: RisonValue): value is RisonObject => {
  return isObject(value);
};
export class AppPlugin {
  private startDependencies: {
    data: DataPublicPluginStart;
    dataShim: DataStart;
    savedObjectsClient: SavedObjectsClientContract;
    editorFrame: EditorFrameStart;
  } | null = null;

  constructor() {}

  setup(core: CoreSetup, { kibana_legacy }: LensPluginSetupDependencies) {
    // TODO: These plugins should not be called from the top level, but since this is the
    // entry point to the app we have no choice until the new platform is ready
    const indexPattern = indexPatternDatasourceSetup();
    const datatableVisualization = datatableVisualizationSetup();
    const xyVisualization = xyVisualizationSetup();
    const metricVisualization = metricVisualizationSetup();
    const editorFrameSetupInterface = editorFrameSetup();

    editorFrameSetupInterface.registerVisualization(xyVisualization);
    editorFrameSetupInterface.registerVisualization(datatableVisualization);
    editorFrameSetupInterface.registerVisualization(metricVisualization);
    editorFrameSetupInterface.registerDatasource(indexPattern);

    kibana_legacy.registerLegacyApp({
      id: 'lens',
      title: NOT_INTERNATIONALIZED_PRODUCT_NAME,
      mount: async (context, params) => {
        if (this.startDependencies === null) {
          throw new Error('mounted before start phase');
        }
        const { data, savedObjectsClient, editorFrame } = this.startDependencies;
        addHelpMenuToAppChrome(context.core.chrome);
        const instance = editorFrame.createInstance({});

        setReportManager(
          new LensReportManager({
            storage: new Storage(localStorage),
            http: core.http,
          })
        );
        const updateUrlTime = (urlVars: Record<string, string>): void => {
          const decoded: RisonObject = rison.decode(urlVars._g) as RisonObject;
          if (!decoded) {
            return;
          }
          // @ts-ignore
          decoded.time = data.query.timefilter.timefilter.getTime();
          urlVars._g = rison.encode((decoded as unknown) as RisonObject);
        };
        const redirectTo = (
          routeProps: RouteComponentProps<{ id?: string }>,
          addToDashboardMode: boolean,
          id?: string
        ) => {
          if (!id) {
            routeProps.history.push('/lens');
          } else if (!addToDashboardMode) {
            routeProps.history.push(`/lens/edit/${id}`);
          } else if (addToDashboardMode && id) {
            routeProps.history.push(`/lens/edit/${id}`);
            const url = context.core.chrome.navLinks.get('kibana:dashboard');
            if (!url) {
              throw new Error('Cannot get last dashboard url');
            }
            const lastDashboardAbsoluteUrl = url.url;
            const basePath = context.core.http.basePath.get();
            const lensUrl = getLensUrlFromDashboardAbsoluteUrl(
              lastDashboardAbsoluteUrl,
              basePath,
              id
            );
            if (!lastDashboardAbsoluteUrl || !lensUrl) {
              throw new Error('Cannot get last dashboard url');
            }
            window.history.pushState({}, '', lensUrl);
            const urlVars = getUrlVars(lastDashboardAbsoluteUrl);
            updateUrlTime(urlVars); // we need to pass in timerange in query params directly
            const dashboardParsedUrl = addEmbeddableToDashboardUrl(
              lastDashboardAbsoluteUrl,
              basePath,
              id,
              urlVars
            );
            if (!dashboardParsedUrl) {
              throw new Error('Problem parsing dashboard url');
            }
            window.history.pushState({}, '', dashboardParsedUrl);
          }
        };

        const renderEditor = (routeProps: RouteComponentProps<{ id?: string }>) => {
          trackUiEvent('loaded');
          const addToDashboardMode =
            !!routeProps.location.search && routeProps.location.search.includes('addToDashboard');
          return (
            <App
              core={context.core}
              data={data}
              editorFrame={instance}
              storage={new Storage(localStorage)}
              docId={routeProps.match.params.id}
              docStorage={new SavedObjectIndexStore(savedObjectsClient)}
              redirectTo={id => redirectTo(routeProps, addToDashboardMode, id)}
              addToDashboardMode={addToDashboardMode}
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
          instance.unmount();
          unmountComponentAtNode(params.element);
        };
      },
    });
  }

  start({ savedObjects }: CoreStart, { data, dataShim }: LensPluginStartDependencies) {
    this.startDependencies = {
      data,
      dataShim,
      savedObjectsClient: savedObjects.client,
      editorFrame: editorFrameStart(),
    };
  }

  stop() {
    stopReportManager();

    // TODO this will be handled by the plugin platform itself
    indexPatternDatasourceStop();
    xyVisualizationStop();
    metricVisualizationStop();
    datatableVisualizationStop();
    editorFrameStop();
  }
}
