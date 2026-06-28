/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin as CorePlugin, PluginInitializerContext } from '@kbn/core/public';
import type { ValidatedEmail, ValidateEmailAddressesOptions } from '../common';
import { validateEmailAddresses as validateEmails } from '../common';

export interface ActionsPublicPluginSetup {
  validateEmailAddresses(
    emails: string[],
    options?: ValidateEmailAddressesOptions
  ): ValidatedEmail[];
  enabledEmailServices: string[];
  isWebhookSslWithPfxEnabled?: boolean;
  isEarsEnabled: boolean;
<<<<<<< HEAD
  isEarsExperimentalEnabled: boolean;
=======
>>>>>>> 9.4
}

export interface Config {
  email: {
    domain_allowlist: string[];
    services: {
      enabled: string[];
    };
  };
  webhook: {
    ssl: {
      pfx: {
        enabled: boolean;
      };
    };
  };
<<<<<<< HEAD
  auth?: {
    ears?: {
      enabled: boolean;
      enableExperimental: boolean;
    };
=======
  ears?: {
    enabled: boolean;
>>>>>>> 9.4
  };
}

export class Plugin implements CorePlugin<ActionsPublicPluginSetup> {
  private readonly allowedEmailDomains: string[] | null = null;
  private readonly enabledEmailServices: string[];
  private readonly webhookSslWithPfxEnabled: boolean;
  private readonly earsEnabled: boolean;
<<<<<<< HEAD
  private readonly earsExperimentalEnabled: boolean;
=======
>>>>>>> 9.4

  constructor(ctx: PluginInitializerContext<Config>) {
    const config = ctx.config.get();
    this.allowedEmailDomains = config.email?.domain_allowlist || null;
    this.enabledEmailServices = Array.from(new Set(config.email?.services?.enabled || ['*']));
    this.webhookSslWithPfxEnabled = config.webhook?.ssl.pfx.enabled ?? true;
<<<<<<< HEAD
    this.earsEnabled = config.auth?.ears?.enabled ?? false;
    this.earsExperimentalEnabled = config.auth?.ears?.enableExperimental ?? false;
=======
    this.earsEnabled = config.ears?.enabled ?? false;
>>>>>>> 9.4
  }

  public setup(): ActionsPublicPluginSetup {
    return {
      validateEmailAddresses: (emails: string[], options: ValidateEmailAddressesOptions) =>
        validateEmails(this.allowedEmailDomains, emails, options),
      enabledEmailServices: this.enabledEmailServices,
      isWebhookSslWithPfxEnabled: this.webhookSslWithPfxEnabled,
      isEarsEnabled: this.earsEnabled,
<<<<<<< HEAD
      isEarsExperimentalEnabled: this.earsExperimentalEnabled,
=======
>>>>>>> 9.4
    };
  }

  public start(): void {}
}
