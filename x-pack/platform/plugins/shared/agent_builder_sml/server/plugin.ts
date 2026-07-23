/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type {
  AgentBuilderSmlPluginSetup,
  AgentBuilderSmlPluginStart,
  AgentBuilderSmlSetupDependencies,
  AgentBuilderSmlStartDependencies,
} from './types';
import { registerFeatures } from './features';
import { registerUISettings } from './ui_settings';
import { registerSearchRoute } from './routes/search';
import { registerAutocompleteRoute } from './routes/autocomplete';
import { createSmlService, type SmlServiceInstance } from './services/sml/sml_service';
import {
  registerSmlCrawlerTaskDefinition,
  scheduleSmlCrawlerTasks,
} from './services/sml/sml_task_definitions';
import { resolveSmlAttachItems } from './services/sml/execute_sml_attach_items';
import type { SmlService } from './services/sml/types';
import { buildIndexAttachment, buildDeleteAttachment } from './start_contract';

export class AgentBuilderSmlPlugin
  implements
    Plugin<
      AgentBuilderSmlPluginSetup,
      AgentBuilderSmlPluginStart,
      AgentBuilderSmlSetupDependencies,
      AgentBuilderSmlStartDependencies
    >
{
  private logger: Logger;
  private smlServiceInstance: SmlServiceInstance;
  private smlService?: SmlService;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
    this.smlServiceInstance = createSmlService();
  }

  setup(
    coreSetup: CoreSetup<AgentBuilderSmlStartDependencies, AgentBuilderSmlPluginStart>,
    setupDeps: AgentBuilderSmlSetupDependencies
  ): AgentBuilderSmlPluginSetup {
    registerFeatures({ features: setupDeps.features });
    registerUISettings({ uiSettings: coreSetup.uiSettings });

    const smlSetup = this.smlServiceInstance.setup({ logger: this.logger.get('sml') });

    registerSmlCrawlerTaskDefinition({
      taskManager: setupDeps.taskManager,
      getCrawlerDeps: async () => {
        const [coreStart] = await coreSetup.getStartServices();
        if (!this.smlService) {
          throw new Error('getCrawlerDeps called before service start');
        }
        return {
          smlService: this.smlService,
          elasticsearch: coreStart.elasticsearch,
          savedObjects: coreStart.savedObjects,
          uiSettings: coreStart.uiSettings,
          logger: this.logger.get('sml'),
        };
      },
    });

    const getSmlService = (): SmlService => {
      if (!this.smlService) {
        throw new Error('SML service not available — plugin has not started');
      }
      return this.smlService;
    };

    const router = coreSetup.http.createRouter();
    registerSearchRoute({
      router,
      coreSetup,
      logger: this.logger,
      getSmlService,
    });
    registerAutocompleteRoute({
      router,
      coreSetup,
      logger: this.logger,
      getSmlService,
    });

    // Runtime fields that reconcile the raw values stored on SML docs with the format
    // Kibana grants use, so a DLS template can filter without any change to ingestion:
    //  - space_resources: raw space id `marketing` -> `space:marketing` (global `*` passed through)
    //  - space_perms:     (space x required-privilege) -> `space:marketing|saved_object:dashboard/get`
    const spaceResourcesScript =
      "for (def s : doc['spaces']) { emit(s == '*' ? '*' : 'space:' + s); }";
    const spacePermsScript =
      "for (def s : doc['spaces']) { for (def p : doc['permissions.kibana.privileges.name']) { " +
      "emit((s == '*' ? '*' : 'space:' + s) + '|' + p); } }";

    // Composite DLS: a KI is visible if the user holds its required privilege in one of the
    // KI's spaces (space_perms), OR it is public (no required privilege) and lives in a space
    // the user can access (space_resources). `_user.application_privileges` /
    // `_user.application_resources` come from the Elasticsearch DLS-template extension.
    const dlsSource = JSON.stringify({
      bool: {
        minimum_should_match: 1,
        should: [
          { terms: { space_perms: '__APP_PRIVS__' } },
          {
            bool: {
              must: [
                { terms: { space_resources: '__APP_RES__' } },
                { bool: { must_not: { exists: { field: 'permissions.kibana.privileges.name' } } } },
              ],
            },
          },
        ],
      },
    })
      .replace('"__APP_PRIVS__"', '{{#toJson}}_user.application_privileges{{/toJson}}')
      .replace('"__APP_RES__"', '{{#toJson}}_user.application_resources{{/toJson}}');

    setupDeps.contextEngine?.registerAiIndex('elastic', {
      name: 'Elastic',
      description:
        'Kibana resources available for use in Agent Builder, including dashboards, ' +
        'visualizations, connectors, workflows, alerting rules, action policies, ' +
        'and significant events.',
      dest: { type: 'index', value: 'ai-index-idx-sml-data' },
      automations: [],
      sources: [],
      index_config: {
        mappings: {
          runtime: {
            space_resources: { type: 'keyword', script: { source: spaceResourcesScript } },
            space_perms: { type: 'keyword', script: { source: spacePermsScript } },
          },
        },
      },
      dls: {
        role: 'ai-index-elastic-reader',
        query: JSON.stringify({ template: { source: dlsSource } }),
      },
    });

    return {
      registerType: smlSetup.registerType,
    };
  }

  start(
    coreStart: CoreStart,
    { taskManager, spaces, security }: AgentBuilderSmlStartDependencies
  ): AgentBuilderSmlPluginStart {
    const { elasticsearch, savedObjects } = coreStart;

    this.smlService = this.smlServiceInstance.start({
      logger: this.logger.get('sml'),
      securityAuthz: security?.authz,
    });

    const smlService = this.smlService;

    scheduleSmlCrawlerTasks({
      taskManager,
      smlService,
      logger: this.logger.get('sml'),
    }).catch((error) => {
      this.logger.error(`Failed to schedule SML crawler tasks: ${error.message}`);
    });

    const startContract: AgentBuilderSmlPluginStart = {
      search: smlService.search,
      getTypeDefinition: smlService.getTypeDefinition,
      resolveSmlAttachItems: (params) => resolveSmlAttachItems({ ...params, sml: smlService }),
      indexAttachment: buildIndexAttachment({
        smlService,
        elasticsearch,
        savedObjects,
        spaces,
        logger: this.logger.get('sml'),
      }),
      deleteAttachment: buildDeleteAttachment({
        smlService,
        elasticsearch,
        savedObjects,
        spaces,
        logger: this.logger.get('sml'),
      }),
    };

    return startContract;
  }

  stop() {}
}
