/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import type { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/server';
import type { LogsSharedPluginStart } from '@kbn/logs-shared-plugin/server';
import type {
  SignalAnalyzer,
  SignalInvestigationServerSetup,
} from '@kbn/signal-investigation-contract';
import type { SignalInvestigationConfig } from '../common/config';
import { AnalyzerRegistry } from './analyzer_registry';
import { createSignalInvestigationFindingsAttachmentType } from './findings_attachment';
import { createLogChangePointsAnalyzer } from './log_change_points_analyzer';
import { createLogRateAnalysisAnalyzer } from './log_rate_analysis_analyzer';
import { registerCatalogRoute, registerLeadRoute } from './routes';

export type { SignalInvestigationServerSetup } from '@kbn/signal-investigation-contract';
export type SignalInvestigationServerStart = Record<string, never>;

interface SignalInvestigationSetupDeps {
  agentBuilder?: AgentBuilderPluginSetup;
}

interface SignalInvestigationStartDeps {
  dataViews: DataViewsServerPluginStart;
  logsDataAccess: LogsDataAccessPluginStart;
  logsShared?: LogsSharedPluginStart;
}

export class SignalInvestigationPlugin
  implements
    Plugin<
      SignalInvestigationServerSetup,
      SignalInvestigationServerStart,
      SignalInvestigationSetupDeps,
      SignalInvestigationStartDeps
    >
{
  constructor(_initContext: PluginInitializerContext<SignalInvestigationConfig>) {}

  public setup(
    core: CoreSetup<SignalInvestigationStartDeps, SignalInvestigationServerStart>,
    plugins: SignalInvestigationSetupDeps
  ): SignalInvestigationServerSetup {
    const router = core.http.createRouter();
    const registry = new AnalyzerRegistry();
    registerCatalogRoute(router, registry);

    const registerAnalyzer = (analyzer: SignalAnalyzer): void => {
      registry.assertCanRegister(analyzer);
      registerLeadRoute(router, analyzer);
      registry.register(analyzer);
    };

    const getLogsDataAccess = async (): Promise<LogsDataAccessPluginStart> => {
      const [, pluginsStart] = await core.getStartServices();
      return pluginsStart.logsDataAccess;
    };
    const getDataViews = async (): Promise<DataViewsServerPluginStart> => {
      const [, pluginsStart] = await core.getStartServices();
      return pluginsStart.dataViews;
    };
    const getLogViews = async () => {
      const [, pluginsStart] = await core.getStartServices();
      return pluginsStart.logsShared?.logViews;
    };

    registerAnalyzer(
      createLogChangePointsAnalyzer({ getLogsDataAccess, getDataViews, getLogViews })
    );
    registerAnalyzer(
      createLogRateAnalysisAnalyzer({ getLogsDataAccess, getDataViews, getLogViews })
    );

    if (plugins.agentBuilder) {
      plugins.agentBuilder.attachments.registerType(
        createSignalInvestigationFindingsAttachmentType() as Parameters<
          typeof plugins.agentBuilder.attachments.registerType
        >[0]
      );
    }

    return { registerAnalyzer };
  }

  public start(): SignalInvestigationServerStart {
    return {};
  }
}
