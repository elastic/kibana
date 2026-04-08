/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Plugin } from '@kbn/core/public';
import { type CoreSetup, type PluginInitializerContext } from '@kbn/core/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { ProductDocBasePluginStart } from '@kbn/product-doc-base-plugin/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { GenAiSettingsConfigType } from '../common/config';

export interface GenAiSettingsStartDeps {
  spaces?: SpacesPluginStart;
  agentBuilder?: AgentBuilderPluginStart;
  licensing: LicensingPluginStart;
  productDocBase: ProductDocBasePluginStart;
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
  constructor(private initializerContext: PluginInitializerContext<GenAiSettingsConfigType>) {}

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
          config: this.initializerContext.config.get(),
        });
      },
    });

    return {};
  }

  public start(): GenAiSettingsPluginStart {
    return {};
  }

  public stop() {}
}
