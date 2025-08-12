/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup, CoreStart } from '@kbn/core/server';
import { SavedObjectsClient } from '@kbn/core/server';
import type { CasesServerSetup, CasesServerStart } from '@kbn/cases-plugin/server';
import { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/server';
import { getExampleByServiceName } from './example_suggestion/case_suggestion_definition';

export interface SetupDependencies {
  cases: CasesServerSetup;
  share: SharePluginSetup;
}

export interface StartDependencies {
  cases: CasesServerStart;
  share: SharePluginStart;
}

export class CaseSuggestionRegistryExamplePlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies>
{
  public setup(
    { http, getStartServices }: CoreSetup<StartDependencies>,
    dependencies: SetupDependencies
  ) {
    const { cases } = dependencies;

    /* example of providing depdencies you may need to your suggestion handler */
    getStartServices().then(([coreStart, pluginsStart]) => {
      const savedObjectsClient = new SavedObjectsClient(
        coreStart.savedObjects.createInternalRepository(['synthetics-monitor'])
      );
      cases.attachmentFramework.registerSuggestion(
        getExampleByServiceName({
          savedObjectsClient,
          share: pluginsStart.share,
        })
      );
    });
  }

  public start(coreStart: CoreStart, pluginsStart: StartDependencies) {}

  public stop() {}
}
