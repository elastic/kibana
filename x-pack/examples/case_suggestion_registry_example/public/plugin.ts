/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup } from '@kbn/core/public';
import type { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import type { CaseSuggestionRegistryPublicStart } from '@kbn/case-suggestion-registry-plugin/public';
import { mount } from './mount';

export interface SetupDependencies {
  developerExamples: DeveloperExamplesSetup;
}

export interface StartDependencies {
  caseSuggestionRegistry: CaseSuggestionRegistryPublicStart;
}

export class CasesSuggestionRegistryExamplePlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies>
{
  public setup(core: CoreSetup<StartDependencies>, { developerExamples }: SetupDependencies) {
    core.application.register({
      id: 'case_suggestion_registry_example',
      title: 'Case Suggestion Registry example',
      visibleIn: [],
      mount: mount(core),
      order: 1000,
    });

    developerExamples.register({
      appId: 'case_suggestion_registry_example',
      title: 'Case Suggestion View',
      description: 'Register suggestions that in appear in the context of a case.',
    });
  }

  public start() {}

  public stop() {}
}
