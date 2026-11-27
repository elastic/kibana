/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { ManagementApp, ManagementSetup } from '@kbn/management-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { Subscription } from 'rxjs';
import { aiAnonymizationSettings } from '@kbn/ai-anonymization-common';
import { isValidLicense } from '../common/license';

interface AiAnonymizationSettingsPublicConfig {
  patternTester: { enabled: boolean };
}

export interface AiAnonymizationSettingsSetupDeps {
  management: ManagementSetup;
}

export interface AiAnonymizationSettingsStartDeps {
  licensing: LicensingPluginStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AiAnonymizationSettingsPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AiAnonymizationSettingsPluginStart {}

export class AiAnonymizationSettingsPlugin implements Plugin<
  AiAnonymizationSettingsPluginSetup,
  AiAnonymizationSettingsPluginStart,
  AiAnonymizationSettingsSetupDeps,
  AiAnonymizationSettingsStartDeps
> {
  private registeredApp?: ManagementApp;
  private licenseSubscription?: Subscription;

  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<AiAnonymizationSettingsStartDeps, AiAnonymizationSettingsPluginStart>,
    { management }: AiAnonymizationSettingsSetupDeps
  ): AiAnonymizationSettingsPluginSetup {
    const {
      patternTester: { enabled: isPatternTesterEnabled },
    } = this.initializerContext.config.get<AiAnonymizationSettingsPublicConfig>();

    this.registeredApp = management.sections.section.ai.registerApp({
      id: 'aiAnonymizationSettings',
      title: i18n.translate('xpack.aiAnonymizationSettings.managementSectionLabel', {
        defaultMessage: 'Anonymization',
      }),
      order: 2,
      keywords: ['ai', 'anonymization', 'regex', 'ner', 'pii', 'settings'],

      mount: async (mountParams) => {
        const { mountManagementSection } = await import('./management_section/mount_section');

        return mountManagementSection({ core, mountParams, isPatternTesterEnabled });
      },
    });

    // Stays disabled until start() confirms the user can save advanced settings and the license is
    // Enterprise, so users who cannot use the page do not get a Stack Management entry for it.
    this.registeredApp.disable();

    return {};
  }

  public start(
    coreStart: CoreStart,
    { licensing }: AiAnonymizationSettingsStartDeps
  ): AiAnonymizationSettingsPluginStart {
    const { capabilities } = coreStart.application;
    const canSaveAdvancedSettings = capabilities.advancedSettings?.save === true;
    // The AI features this page configures run on connectors, which some serverless tiers (for example
    // observability essentials) do not offer. GenAI Settings is hidden there by the same check.
    const hasConnectorsAccess =
      capabilities.actions?.show === true && capabilities.actions?.execute === true;
    // The setting is registered by the inference plugin, which this plugin does not depend on. Without
    // it (`xpack.inference.enabled: false`) reading the setting throws, so the page is not offered.
    const isSettingRegistered = coreStart.uiSettings.isDeclared(aiAnonymizationSettings);

    // The license can change while Kibana runs, so follow it instead of reading it once.
    this.licenseSubscription = licensing.license$.subscribe((license) => {
      if (
        canSaveAdvancedSettings &&
        hasConnectorsAccess &&
        isSettingRegistered &&
        isValidLicense(license)
      ) {
        this.registeredApp?.enable();
      } else {
        this.registeredApp?.disable();
      }
    });

    return {};
  }

  public stop() {
    this.licenseSubscription?.unsubscribe();
  }
}
