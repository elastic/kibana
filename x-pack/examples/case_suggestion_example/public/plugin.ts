/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup, CoreStart } from '@kbn/core/public';
import type { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import type { CasesPublicSetup, CasesPublicStart } from '@kbn/cases-plugin/public';
import { mount } from './mount';
import { SyntheticsMonitorSuggestionDefinition } from './example_suggestion/case_suggestion_definition';
import { SyntheticsMonitorSuggestion } from '../common/types';

export interface SetupDependencies {
  developerExamples: DeveloperExamplesSetup;
  cases: CasesPublicSetup;
}

export interface StartDependencies {
  cases: CasesPublicStart;
  http: CoreSetup['http'];
}

export class CaseSuggestionRegistryExamplePlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies>
{
  public setup(
    core: CoreSetup<StartDependencies>,
    { developerExamples, cases }: SetupDependencies
  ) {
    // Register the case suggestion definition with the case suggestion registry
    cases.attachmentFramework.registerSuggestion<SyntheticsMonitorSuggestion>(
      SyntheticsMonitorSuggestionDefinition
    );
    core.application.register({
      id: 'case_suggestion_registry_example',
      title: 'Case Suggestion Registry example',
      visibleIn: [],
      mount: mount(core),
      order: 1000,
    });

    developerExamples.register({
      appId: 'case_suggestion_registry_example',
      title: 'Case Suggestion Registry Example View',
      description:
        'Register case suggestion handlers that can be used to fetch Kibana assets based on provided context from a case.',
    });
  }

  public start(coreStart: CoreStart, pluginsStart: StartDependencies) {
    // Return nothing as this plugin does not provide any public API
    return {};
  }

  public stop() {}
}
