/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Subscription } from 'rxjs';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { ManagementApp } from '@kbn/management-plugin/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type { ServerlessPluginStart } from '@kbn/serverless/public';
import type { ProductDocBasePluginStart } from '@kbn/product-doc-base-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';

import type {
  ObservabilityAIAssistantPublicSetup,
  ObservabilityAIAssistantPublicStart,
} from '@kbn/observability-ai-assistant-plugin/public';
import type { MlPluginSetup, MlPluginStart } from '@kbn/ml-plugin/public';
import type { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AiAssistantManagementObservabilityPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AiAssistantManagementObservabilityPluginStart {}

export interface SetupDependencies {
  management: ManagementSetup;
  home?: HomePublicPluginSetup;
  observabilityAIAssistant: ObservabilityAIAssistantPublicSetup;
  ml: MlPluginStart;
  spaces?: SpacesPluginSetup;
}

export interface StartDependencies {
  observabilityAIAssistant: ObservabilityAIAssistantPublicStart;
  serverless?: ServerlessPluginStart;
  productDocBase?: ProductDocBasePluginStart;
  ml: MlPluginSetup;
  spaces?: SpacesPluginStart;
  cloud?: CloudStart;
  licensing: LicensingPluginStart;
}

export interface ConfigSchema {
  logSourcesEnabled: boolean;
  spacesEnabled: boolean;
}

export class AiAssistantManagementObservabilityPlugin
  implements
    Plugin<
      AiAssistantManagementObservabilityPluginSetup,
      AiAssistantManagementObservabilityPluginStart,
      SetupDependencies,
      StartDependencies
    >
{
  private readonly config: ConfigSchema;
  private readonly isServerless: boolean;
  private registeredApp?: ManagementApp;
  private licensingSubscription?: Subscription;

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.config = context.config.get();
    this.isServerless = context.env.packageInfo.buildFlavor === 'serverless';
  }

  public setup(
    core: CoreSetup<StartDependencies, AiAssistantManagementObservabilityPluginStart>,
    { home, management, observabilityAIAssistant }: SetupDependencies
  ): AiAssistantManagementObservabilityPluginSetup {
    const title = i18n.translate('xpack.observabilityAiAssistantManagement.app.title', {
      defaultMessage: 'AI Assistant',
    });

    if (home) {
      home.featureCatalogue.register({
        id: 'ai_assistant_observability',
        title,
        description: i18n.translate('xpack.observabilityAiAssistantManagement.app.description', {
          defaultMessage: 'Manage your AI Assistant for Observability and Search.',
        }),
        icon: 'sparkles',
        path: '/app/management/ai/ai-assistant/observability',
        showOnHomePage: false,
        category: 'admin',
      });
    }

    if (observabilityAIAssistant) {
      this.registeredApp = management.sections.section.ai.registerApp({
        id: 'observabilityAiAssistantManagement',
        title,
        hideFromSidebar: true,
        hideFromGlobalSearch: !this.isServerless,
        order: 2,
        mount: async (mountParams) => {
          const { mountManagementSection } = await import('./app');

          return mountManagementSection({
            core,
            mountParams,
            config: this.config,
          });
        },
      });

      // Default to disabled until license check runs in start()
      this.registeredApp.disable();
    }

    return {};
  }

  public start(coreStart: CoreStart, { licensing }: StartDependencies) {
    if (licensing) {
      this.licensingSubscription = licensing.license$.subscribe((license) => {
        const isEnterprise = license?.hasAtLeast('enterprise');
        const isAiAssistantEnabled =
          coreStart.application.capabilities.observabilityAIAssistant?.show;
        if (isEnterprise && isAiAssistantEnabled) {
          this.registeredApp?.enable();
        } else {
          this.registeredApp?.disable();
        }
      });
    }

    return {};
  }

  public stop() {
    this.licensingSubscription?.unsubscribe();
  }
}
