/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup } from '@kbn/core/server';
import type { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import type { CaseSuggestionRegistryServerStart } from '@kbn/case-suggestion-registry-plugin/server';

export interface SetupDependencies {
  developerExamples: DeveloperExamplesSetup;
}

export interface StartDependencies {
  caseSuggestionRegistry: CaseSuggestionRegistryServerStart;
}

export class CasesSuggestionRegistryExamplePlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies>
{
  public setup(core: CoreSetup<StartDependencies>, dependencies: SetupDependencies) {}

  public start() {}

  public stop() {}
}
