/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';
import { i18n } from '@kbn/i18n';
import type { Plugin } from '@kbn/core/public';
import { type CoreSetup, type CoreStart, type PluginInitializerContext } from '@kbn/core/public';
import type { ManagementApp, ManagementSetup } from '@kbn/management-plugin/public';
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
  private registeredApp?: ManagementApp;
  private licensingSubscription?: Subscription;

  constructor(private initializerContext: PluginInitializerContext<GenAiSettingsConfigType>) {}

  public setup(
    core: CoreSetup<GenAiSettingsStartDeps, GenAiSettingsPluginStart>,
    { management }: GenAiSettingsSetupDeps
  ): GenAiSettingsPluginSetup {
    // This section depends mainly on Connectors feature, but should have its own Kibana feature setting in the future.
    this.registeredApp = management.sections.section.ai.registerApp({
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

    // Default to disabled until license and capability checks run in start()
    this.registeredApp.disable();

    return {};
  }

  public start(
    coreStart: CoreStart,
    { licensing }: GenAiSettingsStartDeps
  ): GenAiSettingsPluginStart {
    const { capabilities } = coreStart.application;

    const hasConnectorsReadPrivilege =
      capabilities.actions?.show === true && capabilities.actions?.execute === true;
    const hasAnonymizationPrivilege =
      capabilities.anonymization?.show === true || capabilities.anonymization?.manage === true;

    if (licensing) {
      this.licensingSubscription = licensing.license$.subscribe((license) => {
        const hasEnterpriseLicense = license.hasAtLeast('enterprise');

        if (
          this.registeredApp &&
          hasEnterpriseLicense &&
          (hasConnectorsReadPrivilege || hasAnonymizationPrivilege)
        ) {
          this.registeredApp.enable();
        } else if (this.registeredApp) {
          this.registeredApp.disable();
        }
      });
    }

    return {};
  }

  public stop() {
    this.licensingSubscription?.unsubscribe();
  }
}
