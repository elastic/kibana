/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorDefinition } from '@kbn/share-plugin/public';
import {
  ALERTING_V2_RULE_CREATE_LOCATOR,
  type AlertingV2RuleCreateLocatorParams,
} from '@kbn/deeplinks-alerting-v2';
import { MANAGEMENT_APP_ID, ALERTING_V2_MANAGEMENT_PATH } from '../constants';

export class AlertingV2RuleCreateLocatorDefinition
  implements LocatorDefinition<AlertingV2RuleCreateLocatorParams>
{
  public readonly id = ALERTING_V2_RULE_CREATE_LOCATOR;

  public readonly getLocation = async ({ cloneFrom }: AlertingV2RuleCreateLocatorParams) => ({
    app: MANAGEMENT_APP_ID,
    path: cloneFrom
      ? `${ALERTING_V2_MANAGEMENT_PATH}/create?cloneFrom=${encodeURIComponent(cloneFrom)}`
      : `${ALERTING_V2_MANAGEMENT_PATH}/create`,
    state: {},
  });
}
