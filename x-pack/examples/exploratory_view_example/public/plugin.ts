/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup, AppNavLinkStatus } from '../../../../src/core/public';
import type { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import type { ObservabilityPublicStart } from '../../../plugins/observability/public';
import type { DeveloperExamplesSetup } from '../../../../examples/developer_examples/public';
import { mount } from './mount';

export interface SetupDependencies {
  developerExamples: DeveloperExamplesSetup;
}

export interface StartDependencies {
  data: DataPublicPluginStart;
  observability: ObservabilityPublicStart;
}

export class ExploratoryViewExamplePlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies>
{
  public setup(core: CoreSetup<StartDependencies>, { developerExamples }: SetupDependencies) {
    core.application.register({
      id: 'exploratory_view_example',
      title: 'Observability Exploratory View example',
      navLinkStatus: AppNavLinkStatus.hidden,
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
