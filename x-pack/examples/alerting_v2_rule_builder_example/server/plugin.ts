/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin } from '@kbn/core/server';
import type { AlertingServerSetup } from '@kbn/alerting-v2-plugin/server';
import { apmLatencyBuilderTypeDefinition } from '../common/apm_latency';

interface SetupDeps {
  alertingVTwo: AlertingServerSetup;
}

export class AlertingV2RuleBuilderExamplePlugin implements Plugin<void, void, SetupDeps> {
  public setup(_core: CoreSetup, { alertingVTwo }: SetupDeps) {
    // One call is enough to author rules of this type over the API: the server
    // now validates their builder fields and generates their query.
    alertingVTwo.registerBuilderType(apmLatencyBuilderTypeDefinition);
  }

  public start() {}

  public stop() {}
}
