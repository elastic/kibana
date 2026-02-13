/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { Route } from '@kbn/core-di-server';
import { CreateRuleRoute } from '../routes/create_rule_route';
import { UpdateRuleRoute } from '../routes/update_rule_route';
import { GetRulesRoute } from '../routes/get_rules_route';
import { GetRuleRoute } from '../routes/get_rule_route';
import { DeleteRuleRoute } from '../routes/delete_rule_route';
import { RunDispatchRoute } from '../routes/run_dispatch_route';
import { CreateAlertActionRoute } from '../routes/create_alert_action_route';
import { BulkCreateAlertActionRoute } from '../routes/bulk_create_alert_action_route';
import { CreateNotificationPolicyRoute } from '../routes/notification_policies/create_notification_policy_route';
import { GetNotificationPolicyRoute } from '../routes/notification_policies/get_notification_policy_route';
import { UpdateNotificationPolicyRoute } from '../routes/notification_policies/update_notification_policy_route';
import { DeleteNotificationPolicyRoute } from '../routes/notification_policies/delete_notification_policy_route';

export function bindRoutes({ bind }: ContainerModuleLoadOptions) {
  bind(Route).toConstantValue(CreateRuleRoute);
  bind(Route).toConstantValue(UpdateRuleRoute);
  bind(Route).toConstantValue(GetRulesRoute);
  bind(Route).toConstantValue(GetRuleRoute);
  bind(Route).toConstantValue(DeleteRuleRoute);
  bind(Route).toConstantValue(RunDispatchRoute);
  bind(Route).toConstantValue(CreateAlertActionRoute);
  bind(Route).toConstantValue(BulkCreateAlertActionRoute);
  bind(Route).toConstantValue(CreateNotificationPolicyRoute);
  bind(Route).toConstantValue(GetNotificationPolicyRoute);
  bind(Route).toConstantValue(UpdateNotificationPolicyRoute);
  bind(Route).toConstantValue(DeleteNotificationPolicyRoute);
}
