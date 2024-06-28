/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup, AppMountParameters } from '@kbn/core/public';
import { PluginSetupContract as AlertingSetup } from '@kbn/alerting-plugin/public';
import { ChartsPluginStart } from '@kbn/charts-plugin/public';
import {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';

export interface GenAiStreamingResponseExamplePublicSetupDeps {
  alerting: AlertingSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  developerExamples: DeveloperExamplesSetup;
}

export interface GenAiStreamingResponseExamplePublicStartDeps {
  alerting: AlertingSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  charts: ChartsPluginStart;
  data: DataPublicPluginStart;
}

export class GenAiStreamingResponseExamplePlugin
  implements Plugin<void, void, GenAiStreamingResponseExamplePublicSetupDeps>
{
  public setup(
    core: CoreSetup<GenAiStreamingResponseExamplePublicStartDeps, void>,
    { developerExamples }: GenAiStreamingResponseExamplePublicSetupDeps
  ) {
    core.application.register({
      id: 'GenAiStreamingResponseExample',
      title: 'OpenAI Streaming Response Example',
      visibleIn: [],
      async mount(params: AppMountParameters) {
        const [coreStart, depsStart] = await core.getStartServices();
        const { renderApp } = await import('./application');
        return renderApp(coreStart, depsStart, params);
      },
    });

    developerExamples.register({
      appId: 'GenAiStreamingResponseExample',
      title: 'OpenAI Streaming Response Example',
      description: 'This example demonstrates how to stream a response from an OpenAI connector',
    });
  }

  public start() {}
  public stop() {}
}
