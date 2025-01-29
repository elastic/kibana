/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ObservabilityPublicStart } from '@kbn/observability-plugin/public';
import type { ExploratoryViewPublicStart } from '@kbn/exploratory-view-plugin/public';
import type { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import { mount } from './mount';

export interface SetupDependencies {
  developerExamples: DeveloperExamplesSetup;
}

export interface StartDependencies {
  data: DataPublicPluginStart;
  observability: ObservabilityPublicStart;
  exploratoryView: ExploratoryViewPublicStart;
}

export class ExploratoryViewExamplePlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies>
{
  public setup(core: CoreSetup<StartDependencies>, { developerExamples }: SetupDependencies) {
    core.application.register({
      id: 'exploratory_view_example',
      title: 'Observability Exploratory View example',
      visibleIn: [],
      mount: mount(core),
      order: 1000,
    });

    developerExamples.register({
      appId: 'exploratory_view_example',
      title: 'Observability Exploratory View',
      description:
        'Embed Observability exploratory view in your observability solution app to render common visualizations',
    });
  }

  public start() {}

  public stop() {}
}
