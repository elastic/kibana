/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { type CoreSetup, Plugin, type CoreStart } from '@kbn/core/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GenAiSettingsPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GenAiSettingsPluginStart {}

export interface SetupDependencies {
  management: ManagementSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StartDependencies {}

export class GenAiSettingsPlugin
  implements
    Plugin<
      GenAiSettingsPluginSetup,
      GenAiSettingsPluginStart,
      SetupDependencies,
      StartDependencies
    >
{
  constructor() {}

  public setup(
    core: CoreSetup<StartDependencies, GenAiSettingsPluginStart>,
    { management }: SetupDependencies
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
