/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { HashRouter, Route, RouteComponentProps, Switch } from 'react-router-dom';
import { render, unmountComponentAtNode } from 'react-dom';
import { AppMountParameters, CoreSetup, CoreStart } from 'src/core/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from 'src/plugins/data/public';
import rison, { RisonObject, RisonValue } from 'rison-node';
import { isObject } from 'lodash';
import { Storage } from '../../../../../src/plugins/kibana_utils/public';
import { EditorFrameService } from './editor_frame_service';
import { IndexPatternDatasource } from './indexpattern_datasource';
import { addHelpMenuToAppChrome } from './help_menu_util';
import { SavedObjectIndexStore } from './persistence';
import { XyVisualization } from './xy_visualization';
import { MetricVisualization } from './metric_visualization';
import { ExpressionsSetup, ExpressionsStart } from '../../../../../src/plugins/expressions/public';
import { DatatableVisualization } from './datatable_visualization';
import { App } from './app_plugin';
import {
  LensReportManager,
  setReportManager,
  stopReportManager,
  trackUiEvent,
} from './lens_ui_telemetry';
import { KibanaLegacySetup } from '../../../../../src/plugins/kibana_legacy/public';
import { NOT_INTERNATIONALIZED_PRODUCT_NAME } from '../../../../plugins/lens/common';
import {
  addEmbeddableToDashboardUrl,
  getUrlVars,
  getLensUrlFromDashboardAbsoluteUrl,
} from '../../../../../src/legacy/core_plugins/kibana/public/dashboard/np_ready/url_helper';
import { FormatFactory } from './legacy_imports';
import { IEmbeddableSetup, IEmbeddableStart } from '../../../../../src/plugins/embeddable/public';
import { EditorFrameStart } from './types';

export interface LensPluginSetupDependencies {
  kibanaLegacy: KibanaLegacySetup;
  expressions: ExpressionsSetup;
  data: DataPublicPluginSetup;
  embeddable: IEmbeddableSetup;
  __LEGACY: {
    formatFactory: FormatFactory;
  };
}

export interface LensPluginStartDependencies {
  data: DataPublicPluginStart;
  embeddable: IEmbeddableStart;
  expressions: ExpressionsStart;
}

export const isRisonObject = (value: RisonValue): value is RisonObject => {
  return isObject(value);
};
export class LensPlugin {
  private datatableVisualization: DatatableVisualization;
  private editorFrameService: EditorFrameService;
  private createEditorFrame: EditorFrameStart['createInstance'] | null = null;
  private indexpatternDatasource: IndexPatternDatasource;
  private xyVisualization: XyVisualization;
  private metricVisualization: MetricVisualization;

  constructor() {
    this.datatableVisualization = new DatatableVisualization();
    this.editorFrameService = new EditorFrameService();
    this.indexpatternDatasource = new IndexPatternDatasource();
    this.xyVisualization = new XyVisualization();
    this.metricVisualization = new MetricVisualization();
  }

  setup(
    core: CoreSetup<LensPluginStartDependencies>,
    {
      kibanaLegacy,
      expressions,
      data,
      embeddable,
      __LEGACY: { formatFactory },
    }: LensPluginSetupDependencies
  ) {
    const editorFrameSetupInterface = this.editorFrameService.setup(core, {
      data,
      embeddable,
      expressions,
    });
    const dependencies = {
      expressions,
      data,
      editorFrame: editorFrameSetupInterface,
      formatFactory,
    };
    this.indexpatternDatasource.setup(core, dependencies);
    this.xyVisualization.setup(core, dependencies);
    this.datatableVisualization.setup(core, dependencies);
    this.metricVisualization.setup(core, dependencies);

    kibanaLegacy.registerLegacyApp({
      id: 'lens',
      title: NOT_INTERNATIONALIZED_PRODUCT_NAME,
      mount: async (params: AppMountParameters) => {
        const [coreStart, startDependencies] = await core.getStartServices();
        const dataStart = startDependencies.data;
        const savedObjectsClient = coreStart.savedObjects.client;
        addHelpMenuToAppChrome(coreStart.chrome);

        const instance = await this.createEditorFrame!({});

        setReportManager(
          new LensReportManager({
            storage: new Storage(localStorage),
            http: core.http,
          })
        );
        const updateUrlTime = (urlVars: Record<string, string>): void => {
          const decoded = rison.decode(urlVars._g);
          if (!isRisonObject(decoded)) {
            return;
          }
          // @ts-ignore
          decoded.time = dataStart.query.timefilter.timefilter.getTime();
          urlVars._g = rison.encode(decoded);
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
            const url = coreStart.chrome.navLinks.get('kibana:dashboard');
            if (!url) {
              throw new Error('Cannot get last dashboard url');
            }
            const lastDashboardAbsoluteUrl = url.url;
            const basePath = coreStart.http.basePath.get();
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
              core={coreStart}
              data={dataStart}
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

  start(core: CoreStart, startDependencies: LensPluginStartDependencies) {
    this.createEditorFrame = this.editorFrameService.start(core, startDependencies).createInstance;
  }

  stop() {
    stopReportManager();
  }
}
