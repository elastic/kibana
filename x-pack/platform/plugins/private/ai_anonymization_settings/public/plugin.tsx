/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { ManagementApp, ManagementSetup } from '@kbn/management-plugin/public';

export interface AiAnonymizationSettingsSetupDeps {
  management: ManagementSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AiAnonymizationSettingsStartDeps {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AiAnonymizationSettingsPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AiAnonymizationSettingsPluginStart {}

export class AiAnonymizationSettingsPlugin
  implements
    Plugin<
      AiAnonymizationSettingsPluginSetup,
      AiAnonymizationSettingsPluginStart,
      AiAnonymizationSettingsSetupDeps,
      AiAnonymizationSettingsStartDeps
    >
{
  private registeredApp?: ManagementApp;

  public setup(
    core: CoreSetup<AiAnonymizationSettingsStartDeps, AiAnonymizationSettingsPluginStart>,
    { management }: AiAnonymizationSettingsSetupDeps
  ): AiAnonymizationSettingsPluginSetup {
    this.registeredApp = management.sections.section.ai.registerApp({
      id: 'aiAnonymizationSettings',
      title: i18n.translate('xpack.aiAnonymizationSettings.managementSectionLabel', {
        defaultMessage: 'Anonymization',
      }),
      order: 2,
      keywords: ['ai', 'anonymization', 'regex', 'ner', 'pii', 'settings'],

      mount: async (mountParams) => {
        const { mountManagementSection } = await import('./management_section/mount_section');

        return mountManagementSection({ core, mountParams });
      },
    });

    // Stays disabled until start() confirms the user can save advanced settings, so users without
    // that privilege do not get a Stack Management entry for a page they cannot use.
    this.registeredApp.disable();

    return {};
  }

  public start(coreStart: CoreStart): AiAnonymizationSettingsPluginStart {
    if (coreStart.application.capabilities.advancedSettings?.save === true) {
      this.registeredApp?.enable();
    }

    return {};
  }

  public stop() {}
}
