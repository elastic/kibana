/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingServerSetup } from '@kbn/alerting-plugin/server';
import type { LocatorClient } from '@kbn/share-plugin/common/url_service';
import { DegradedDocsRuleType } from './degraded_docs/register';

export function registerBuiltInRuleTypes(
  alertingPlugin: AlertingServerSetup,
  locatorsClient?: LocatorClient
) {
  alertingPlugin.registerType(DegradedDocsRuleType(locatorsClient));
}
