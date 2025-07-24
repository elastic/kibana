/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup, CoreStart } from '@kbn/core/public';
import type { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import type { ContextRegistryPublicStart } from '@kbn/context-registry-plugin/public';
import { mount } from './mount';
import { syntheticsMonitorContextDefinition } from './example_context/context_definition';
import { SyntheticsMonitorContext } from '../common/types';

export interface SetupDependencies {
  developerExamples: DeveloperExamplesSetup;
  contextRegistry: ContextRegistryPublicStart;
}

export interface StartDependencies {
  contextRegistry: ContextRegistryPublicStart;
  http: CoreSetup['http'];
}

export class ContextRegistryExamplePlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies>
{
  public setup(core: CoreSetup<StartDependencies>, { developerExamples }: SetupDependencies) {
    core.application.register({
      id: 'context_registry_example',
      title: 'Context Registry example',
      visibleIn: [],
      mount: mount(core),
      order: 1000,
    });

    developerExamples.register({
      appId: 'context_registry_example',
      title: 'Context Example View',
      description:
        'Register context handlers that can be used to fetch Kibana assets based on provided context.',
    });
  }

  public start(coreStart: CoreStart, pluginsStart: StartDependencies) {
    const { contextRegistry } = pluginsStart;

    // Register the context definition with the context registry
    contextRegistry.registry.registerHandler<SyntheticsMonitorContext>(
      syntheticsMonitorContextDefinition
    );

    // Return nothing as this plugin does not provide any public API
    return {};
  }

  public stop() {}
}
