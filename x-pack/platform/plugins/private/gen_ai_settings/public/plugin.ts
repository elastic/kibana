/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  type CoreSetup,
  Plugin,
  type CoreStart,
  type PluginInitializerContext,
} from '@kbn/core/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';

export interface GenAiSettingsStartDeps {
  spaces?: SpacesPluginStart;
}

export interface GenAiSettingsSetupDeps {
  management: ManagementSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GenAiSettingsPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GenAiSettingsPluginStart {}

export class GenAiSettingsPlugin
  implements
    Plugin<
      GenAiSettingsPluginSetup,
      GenAiSettingsPluginStart,
      GenAiSettingsSetupDeps,
      GenAiSettingsStartDeps
    >
{
  private isServerless: boolean = false;

  constructor(private initializerContext: PluginInitializerContext) {
    this.isServerless = initializerContext.env.packageInfo.buildFlavor === 'serverless';
  }

  public setup(
    core: CoreSetup<GenAiSettingsStartDeps, GenAiSettingsPluginStart>,
    { management }: GenAiSettingsSetupDeps
  ): GenAiSettingsPluginSetup {
    management.sections.section.ai.registerApp({
      id: 'genAiSettings',
      title: i18n.translate('genAiSettings.managementSectionLabel', {
        defaultMessage: 'GenAI Settings',
      }),
      order: 1,
      keywords: ['ai', 'generative', 'settings', 'configuration'],
      mount: async (mountParams) => {
        const { mountManagementSection } = await import('./management_section/mount_section');

        return mountManagementSection({
          core,
          mountParams,
          isServerless: this.isServerless,
        });
      },
    });
    return {};
  }

  public start(coreStart: CoreStart): GenAiSettingsPluginStart {
    return {};
  }

  public stop() {}
}
