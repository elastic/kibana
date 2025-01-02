/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { LogsLocatorDefinition } from '../common/locators';
import { createLogAIAssistant, createLogsAIAssistantRenderer } from './components/log_ai_assistant';
import { createLogsOverview } from './components/logs_overview';
import { LogViewsService } from './services/log_views';
import {
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
    const { http, settings } = core;
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

    return {
      logViews,
      LogAIAssistant,
      LogsOverview,
    };
  }

  public stop() {}
}
