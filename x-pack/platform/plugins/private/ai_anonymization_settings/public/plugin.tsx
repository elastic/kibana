/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CoreSetup, Plugin } from '@kbn/core/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';

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
  public setup(
    core: CoreSetup<AiAnonymizationSettingsStartDeps, AiAnonymizationSettingsPluginStart>,
    { management }: AiAnonymizationSettingsSetupDeps
  ): AiAnonymizationSettingsPluginSetup {
    management.sections.section.ai.registerApp({
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

    return {};
  }

  public start(): AiAnonymizationSettingsPluginStart {
    return {};
  }

  public stop() {}
}
