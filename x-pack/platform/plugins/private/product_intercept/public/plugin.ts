/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subscription } from 'rxjs';
import capitalize from 'lodash/capitalize';
import { type CoreSetup, type CoreStart, Plugin } from '@kbn/core/public';
import type { PluginInitializerContext } from '@kbn/core/public';
import { InterceptsStart } from '@kbn/intercepts-plugin/public';
import { type CloudStart } from '@kbn/cloud-plugin/public';

import { PromptTelemetry } from './telemetry';
import { TRIGGER_DEF_ID, UPGRADE_TRIGGER_DEF_PREFIX_ID } from '../common/constants';

interface ProductInterceptPluginStartDeps {
  intercepts: InterceptsStart;
  cloud: CloudStart;
}

export class ProductInterceptPublicPlugin implements Plugin {
  private readonly telemetry = new PromptTelemetry();
  private interceptSubscription?: Subscription;
  private upgradeInterceptSubscription?: Subscription;
  private readonly buildVersion: string;

  constructor(ctx: PluginInitializerContext) {
    this.buildVersion = ctx.env.packageInfo.version;
  }

  setup(core: CoreSetup) {
    return this.telemetry.setup({ analytics: core.analytics });
  }

  start(core: CoreStart, { intercepts, cloud }: ProductInterceptPluginStartDeps) {
    const eventReporter = this.telemetry.start({
      analytics: core.analytics,
    });

    const productOffering = `Elastic ${capitalize(cloud.serverless.projectType || '')}`.trim();

    void (async () => {
      const currentUser = await core.security.authc.getCurrentUser();

      const surveyUrl = new URL('https://ela.st/kibana-product-survey');

      surveyUrl.searchParams.set('uid', String(currentUser.profile_uid || null));
      surveyUrl.searchParams.set('pid', String(cloud.serverless.projectId || null));
      surveyUrl.searchParams.set('solution', String(cloud.serverless.projectType || null));

      [this.upgradeInterceptSubscription, this.interceptSubscription] = [
        TRIGGER_DEF_ID,
        `${UPGRADE_TRIGGER_DEF_PREFIX_ID}:${this.buildVersion}`,
      ].map((triggerId) =>
        intercepts
          .registerIntercept?.({
            id: triggerId,
            config: () =>
              import('./intercept_registration_config').then(
                ({ productInterceptRegistrationConfig: registrationConfig }) =>
                  registrationConfig({
                    productOffering,
                    surveyUrl,
                    eventReporter,
                  })
              ),
          })
          .subscribe()
      );
    })();

    return {};
  }

  stop() {
    this.interceptSubscription?.unsubscribe();
    this.upgradeInterceptSubscription?.unsubscribe();
  }
}
