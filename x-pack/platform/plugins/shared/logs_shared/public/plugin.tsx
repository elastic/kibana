/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
// import { LogEventsResultContent } from '@kbn/logs-overview';
import { LogsLocatorDefinition } from '../common/locators';
import { createLogAIAssistant, createLogsAIAssistantRenderer } from './components/log_ai_assistant';
import { createLogsOverview } from './components/logs_overview';
import { LogViewsService } from './services/log_views';
import type {
  LogsSharedClientCoreSetup,
  LogsSharedClientPluginClass,
  LogsSharedClientSetupDeps,
  LogsSharedClientStartDeps,
} from './types';

export class LogsSharedPlugin implements LogsSharedClientPluginClass {
  private logViews: LogViewsService;

  constructor() {
    this.logViews = new LogViewsService();
  }

  public setup(coreSetup: LogsSharedClientCoreSetup, pluginsSetup: LogsSharedClientSetupDeps) {
    const logViews = this.logViews.setup();

    const logsLocator = pluginsSetup.share.url.locators.create(
      new LogsLocatorDefinition({
        locators: pluginsSetup.share.url.locators,
        getLogSourcesService: async () => {
          const [_, pluginsStart] = await coreSetup.getStartServices();
          return pluginsStart.logsDataAccess.services.logSourcesService;
        },
      })
    );

    const locators = {
      logsLocator,
    };

    return { logViews, locators };
  }

  public start(core: CoreStart, plugins: LogsSharedClientStartDeps) {
    const { http, settings, theme } = core;
    const {
      charts,
      data,
      dataViews,
      discoverShared,
      logsDataAccess,
      observabilityAIAssistant,
      share,
    } = plugins;

    const logViews = this.logViews.start({
      http,
      dataViews,
      logSourcesService: logsDataAccess.services.logSourcesService,
      search: data.search,
    });

    const LogsOverview = createLogsOverview({
      charts,
      logsDataAccess,
      search: data.search.search,
      searchSource: data.search.searchSource,
      uiSettings: settings,
      share,
      dataViews,
      embeddable: plugins.embeddable,
      mlApi: plugins.ml?.mlApi,
      theme,
    });

    if (!observabilityAIAssistant) {
      return {
        logViews,
        LogsOverview,
      };
    }

    const LogAIAssistant = createLogAIAssistant({ observabilityAIAssistant });

    discoverShared.features.registry.register({
      id: 'observability-logs-ai-assistant',
      render: createLogsAIAssistantRenderer(LogAIAssistant),
    });

    discoverShared.features.registry.register({
      id: 'observability-log-events',
      render: (
        <div> hello</div>
        // <LogEventsResultContent
        //   query=""
        //   index={
        //     'remote_cluster:filebeat-*,remote_cluster:logs-*,re…_logs*,filebeat-*,kibana_sample_data_logs*,logs-*'
        //   }
        //   timeRange={{ from: 'now-15m', to: 'now' }}
        //   dependencies={{
        //     dataViews,
        //     embeddable: plugins.embeddable,
        //     searchSource: data.search.searchSource,
        //   }}
        //   displayOptions={{
        //     solutionNavIdOverride: 'oblt',
        //     enableDocumentViewer: false,
        //     enableFilters: false,
        //   }}
        // />
      ),
    });

    return {
      logViews,
      LogAIAssistant,
      LogsOverview,
    };
  }

  public stop() {}
}
