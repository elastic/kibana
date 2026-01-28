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
import { EMBEDDABLE_LOG_RATE_ANALYSIS_TYPE } from '@kbn/aiops-log-rate-analysis/constants';
import { EMBEDDABLE_PATTERN_ANALYSIS_TYPE } from '@kbn/aiops-log-pattern-analysis/constants';
import { EMBEDDABLE_CHANGE_POINT_CHART_TYPE } from '@kbn/aiops-change-point-detection/constants';
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
import type { ConfigSchema } from './config_schema';
import { setupCapabilities } from './lib/capabilities';
import { transformIn as changePointTransformIn } from '../common/embeddables/change_point_chart/transform_in';
import { transformOut as changePointTransformOut } from '../common/embeddables/change_point_chart/transform_out';
import { transformIn as logRateTransformIn } from '../common/embeddables/log_rate_analysis/transform_in';
import { transformOut as logRateTransformOut } from '../common/embeddables/log_rate_analysis/transform_out';
import { transformIn as patternAnalysisTransformIn } from '../common/embeddables/pattern_analysis/transform_in';
import { transformOut as patternAnalysisTransformOut } from '../common/embeddables/pattern_analysis/transform_out';

export class AiopsPlugin
  implements Plugin<AiopsPluginSetup, AiopsPluginStart, AiopsPluginSetupDeps, AiopsPluginStartDeps>
{
  private readonly logger: Logger;
  private licenseSubscription: Subscription | null = null;
  private usageCounter?: UsageCounter;
  private aiopsEnabled: boolean = true;

  constructor(initializerContext: PluginInitializerContext<ConfigSchema>) {
    this.logger = initializerContext.logger.get();
    this.aiopsEnabled = initializerContext.config.get().ui?.enabled ?? true;
  }

  public setup(
    core: CoreSetup<AiopsPluginStartDeps, AiopsPluginSetupDeps>,
    plugins: AiopsPluginSetupDeps
  ) {
    setupCapabilities(core, this.aiopsEnabled);

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

    plugins.embeddable.registerTransforms(EMBEDDABLE_CHANGE_POINT_CHART_TYPE, {
      getTransforms: () => ({
        transformIn: changePointTransformIn,
        transformOut: changePointTransformOut,
      }),
    });

    plugins.embeddable.registerTransforms(EMBEDDABLE_PATTERN_ANALYSIS_TYPE, {
      getTransforms: () => ({
        transformIn: patternAnalysisTransformIn,
        transformOut: patternAnalysisTransformOut,
      }),
    });

    plugins.embeddable.registerTransforms(EMBEDDABLE_LOG_RATE_ANALYSIS_TYPE, {
      getTransforms: () => ({
        transformIn: logRateTransformIn,
        transformOut: logRateTransformOut,
      }),
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
