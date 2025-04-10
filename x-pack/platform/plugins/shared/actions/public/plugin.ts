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
}

export interface Config {
  email: {
    domain_allowlist: string[];
  };
}

export class Plugin implements CorePlugin<ActionsPublicPluginSetup> {
  private readonly allowedEmailDomains: string[] | null = null;

  constructor(ctx: PluginInitializerContext<Config>) {
    const config = ctx.config.get();
    this.allowedEmailDomains = config.email?.domain_allowlist || null;
  }

  public setup(): ActionsPublicPluginSetup {
    return {
      validateEmailAddresses: (emails: string[], options: ValidateEmailAddressesOptions) =>
        validateEmails(this.allowedEmailDomains, emails, options),
    };
  }

  public start(): void {}
}
