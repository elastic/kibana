/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin } from '@kbn/core/public';
import type { AlertingV2PublicSetup } from '@kbn/alerting-v2-plugin/public';
import { apmLatencyRuleBuilder } from './apm_latency/builder';

interface SetupDeps {
  alertingVTwo: AlertingV2PublicSetup;
}

export class AlertingV2RuleBuilderExamplePlugin implements Plugin<void, void, SetupDeps> {
  public setup(_core: CoreSetup, { alertingVTwo }: SetupDeps) {
    // The builder now appears in the rule creation options and renders the
    // fields of any rule saved with this builder type.
    alertingVTwo.registerRuleBuilder(apmLatencyRuleBuilder);
  }

  public start() {}

  public stop() {}
}
