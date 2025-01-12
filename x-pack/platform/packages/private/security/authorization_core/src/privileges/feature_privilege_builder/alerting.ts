/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, uniq } from 'lodash';

import type { AlertingKibanaPrivilege } from '@kbn/features-plugin/common/alerting_kibana_privilege';
import type { FeatureKibanaPrivileges, KibanaFeature } from '@kbn/features-plugin/server';

import { BaseFeaturePrivilegeBuilder } from './feature_privilege_builder';

enum AlertingEntity {
  RULE = 'rule',
  ALERT = 'alert',
}

const readOperations: Record<AlertingEntity, string[]> = {
  rule: [
    'get',
    'getRuleState',
    'getAlertSummary',
    'getExecutionLog',
    'getActionErrorLog',
    'find',
    'getRuleExecutionKPI',
    'getBackfill',
    'findBackfill',
    'findGaps',
  ],
  alert: ['get', 'find', 'getAuthorizedAlertsIndices', 'getAlertSummary'],
};

const writeOperations: Record<AlertingEntity, string[]> = {
  rule: [
    'create',
    'delete',
    'update',
    'updateApiKey',
    'enable',
    'disable',
    'muteAll',
    'unmuteAll',
    'muteAlert',
    'unmuteAlert',
    'snooze',
    'bulkEdit',
    'bulkDelete',
    'bulkEnable',
    'bulkDisable',
    'unsnooze',
    'runSoon',
    'scheduleBackfill',
    'deleteBackfill',
    'fillGaps',
  ],
  alert: ['update'],
};
const allOperations: Record<AlertingEntity, string[]> = {
  rule: [...readOperations.rule, ...writeOperations.rule],
  alert: [...readOperations.alert, ...writeOperations.alert],
};

export class FeaturePrivilegeAlertingBuilder extends BaseFeaturePrivilegeBuilder {
  public getActions(
    privilegeDefinition: FeatureKibanaPrivileges,
    feature: KibanaFeature
  ): string[] {
    const getAlertingPrivilege = (
      operations: string[],
      privileges: AlertingKibanaPrivilege,
      alertingEntity: string
    ) =>
      privileges.flatMap(({ ruleTypeId, consumers }) =>
        consumers.flatMap((consumer) =>
          operations.map((operation) =>
            this.actions.alerting.get(ruleTypeId, consumer, alertingEntity, operation)
          )
        )
      );

    const getPrivilegesForEntity = (entity: AlertingEntity) => {
      const all = get(privilegeDefinition.alerting, `${entity}.all`) ?? [];
      const read = get(privilegeDefinition.alerting, `${entity}.read`) ?? [];

      return uniq([
        ...getAlertingPrivilege(allOperations[entity], all, entity),
        ...getAlertingPrivilege(readOperations[entity], read, entity),
      ]);
    };

    return uniq([
      ...getPrivilegesForEntity(AlertingEntity.RULE),
      ...getPrivilegesForEntity(AlertingEntity.ALERT),
    ]);
  }
}
