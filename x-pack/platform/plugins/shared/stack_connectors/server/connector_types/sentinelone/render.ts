/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map } from 'lodash';
import { set } from '@kbn/safer-lodash-set/fp';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { ExecutorParams } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { Logger } from '@kbn/core/server';
import { SUB_ACTION } from '../../../common/sentinelone/constants';

interface Context {
  alerts: Ecs[];
}

export const renderParameterTemplates = (
  logger: Logger,
  params: ExecutorParams,
  variables: Record<string, unknown>
) => {
  const context = variables?.context as Context;
  const alertIds = map(context.alerts, '_id');

  if (params?.subAction === SUB_ACTION.ISOLATE_HOST) {
    return {
      subAction: SUB_ACTION.ISOLATE_HOST,
      subActionParams: {
        computerName: context.alerts[0].host?.name,
        alertIds,
      },
    };
  }

  if (params?.subAction === SUB_ACTION.RELEASE_HOST) {
    return {
      subAction: SUB_ACTION.RELEASE_HOST,
      subActionParams: {
        computerName: context.alerts[0].host?.name,
        alertIds,
      },
    };
  }

  if (params?.subAction === SUB_ACTION.EXECUTE_SCRIPT) {
    return {
      subAction: SUB_ACTION.EXECUTE_SCRIPT,
      subActionParams: {
        computerName: context.alerts[0].host?.name,
        ...params.subActionParams,
        alertIds,
      },
    };
  }

  let body: string;
  try {
    let bodyObject;
    const alerts = context.alerts;
    if (alerts) {
      // Remove the "kibana" entry from all alerts to reduce weight, the same data can be found in other parts of the alert object.
      bodyObject = set(
        'context.alerts',
        alerts.map(({ kibana, ...alert }) => alert),
        variables
      );
    } else {
      bodyObject = variables;
    }
    body = JSON.stringify(bodyObject);
  } catch (err) {
    body = JSON.stringify({ error: { message: err.message } });
  }
  return set('subActionParams.body', body, params);
};
