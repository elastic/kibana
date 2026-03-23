/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorDefinition } from '@kbn/share-plugin/public';
import {
  ALERTING_V2_RULE_DETAILS_LOCATOR,
  type AlertingV2RuleDetailsLocatorParams,
} from '@kbn/deeplinks-alerting-v2';
import { MANAGEMENT_APP_ID, ALERTING_V2_MANAGEMENT_PATH } from '../constants';

export class AlertingV2RuleDetailsLocatorDefinition
  implements LocatorDefinition<AlertingV2RuleDetailsLocatorParams>
{
  public readonly id = ALERTING_V2_RULE_DETAILS_LOCATOR;

  public readonly getLocation = async ({ ruleId }: AlertingV2RuleDetailsLocatorParams) => ({
    app: MANAGEMENT_APP_ID,
    path: `${ALERTING_V2_MANAGEMENT_PATH}/${encodeURIComponent(ruleId)}`,
    state: {},
  });
}
