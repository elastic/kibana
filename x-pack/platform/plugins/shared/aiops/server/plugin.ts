/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';

import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { AIOPS_PLUGIN_ID } from '@kbn/aiops-common/constants';
import { isActiveLicense } from './lib/license';
import type {
  AiopsLicense,
  AiopsPluginSetup,
  AiopsPluginStart,
  AiopsPluginSetupDeps,
  AiopsPluginStartDeps,
} from './types';
import { defineRoute as defineLogRateAnalysisFieldCandidatesRoute } from './routes/log_rate_analysis_field_candidates/define_route';
import { defineRoute as defineLogRateAnalysisRoute } from './routes/log_rate_analysis/define_route';
import { defineRoute as defineCategorizationFieldValidationRoute } from './routes/categorization_field_validation/define_route';
import { registerCasesPersistableState } from './register_cases';

export class AiopsPlugin
  implements Plugin<AiopsPluginSetup, AiopsPluginStart, AiopsPluginSetupDeps, AiopsPluginStartDeps>
{
  private readonly logger: Logger;
  private licenseSubscription: Subscription | null = null;
  private usageCounter?: UsageCounter;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(
    core: CoreSetup<AiopsPluginStartDeps, AiopsPluginSetupDeps>,
    plugins: AiopsPluginSetupDeps
  ) {
    this.logger.debug('aiops: Setup');
    this.usageCounter = plugins.usageCollection?.createUsageCounter(AIOPS_PLUGIN_ID);

    // Subscribe to license changes and store the current license in `currentLicense`.
    // This way we can pass on license changes to the route factory having always
    // the current license because it's stored in a mutable attribute.
    const aiopsLicense: AiopsLicense = { isActivePlatinumLicense: false };
    this.licenseSubscription = plugins.licensing.license$.subscribe((license) => {
      aiopsLicense.isActivePlatinumLicense = isActiveLicense('platinum', license);

      if (aiopsLicense.isActivePlatinumLicense) {
        registerCasesPersistableState(plugins.cases, this.logger);
      }
    });

    const router = core.http.createRouter<DataRequestHandlerContext>();

    // Register server side APIs
    void core.getStartServices().then(([coreStart, depsStart]) => {
      defineLogRateAnalysisFieldCandidatesRoute(router, aiopsLicense, coreStart, this.usageCounter);
      defineLogRateAnalysisRoute(router, aiopsLicense, this.logger, coreStart, this.usageCounter);
      defineCategorizationFieldValidationRoute(router, aiopsLicense, this.usageCounter);
    });

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('aiops: Started');
    return {};
  }

  public stop() {
    this.logger.debug('aiops: Stop');
    this.licenseSubscription?.unsubscribe();
  }
}
