/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { SqlQueryResponse } from '@elastic/elasticsearch/lib/api/types';

import {
  RuleType,
  AlertInstanceContext,
  AlertExecutorOptions,
} from '../../../../plugins/alerting/server';

// ts compile error on next line, so inlining ...
// import { STACK_ALERTS_FEATURE_ID } from '../../../../plugins/stack_alerts/common';
const STACK_ALERTS_FEATURE_ID = 'stackAlerts';

type Params = TypeOf<typeof ParamsSchema>;

const ParamsSchema = schema.object({
  query: schema.string(),
});

interface ActionContext extends AlertInstanceContext {
  message: string;
}

export const RuleId = 'ow22-sql';
export const ActionGroupId = 'found';

export const ruleType: RuleType<Params, never, {}, {}, ActionContext, typeof ActionGroupId> = {
  id: RuleId,
  name: 'Alerting rule that runs an sql query and creates alerts from rows',
  actionGroups: [{ id: ActionGroupId, name: ActionGroupId }],
  executor,
  defaultActionGroupId: ActionGroupId,
  validate: {
    params: ParamsSchema,
  },
  actionVariables: {
    context: [{ name: 'message', description: 'A pre-constructed message for the alert.' }],
    params: [{ name: 'query', description: 'SQL query to run.' }],
  },
  minimumLicenseRequired: 'basic',
  isExportable: true,
  producer: STACK_ALERTS_FEATURE_ID,
  doesSetRecoveryContext: true,
};

async function executor(
  options: AlertExecutorOptions<Params, {}, {}, ActionContext, typeof ActionGroupId>
) {
  const { services, params } = options;
  const { alertFactory, scopedClusterClient } = services;

  const result = await scopedClusterClient.asCurrentUser.sql.query({
    format: 'json',
    query: params.query,
  });

  const objects = sqlResultToObjects(result);

  for (const object of objects) {
    alertFactory.create(object.instanceId).scheduleActions(ActionGroupId, object);
  }
}

// convert the sql result to an array of object, ensuring there is an
// instanceId property, and only keeping the first object for each
// instanceId property
function sqlResultToObjects(sqlResult: SqlQueryResponse): any[] {
  const columns = sqlResult.columns || [];
  const props = columns.map((element) => element.name);
  const allObjects = sqlResult.rows.map((row) => {
    const object: any = { instanceId: '' };
    for (let i = 0; i < props.length; i++) {
      object[props[i]] = row[i];
    }
    return object;
  });
  const seen = new Set();
  const objects = allObjects.filter((object) => {
    if (seen.has(object.instanceId)) return false;
    seen.add(object.instanceId);
    return true;
  });

  return objects;
}
