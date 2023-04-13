/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { SqlQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import { Logger } from 'kibana/server';

import {
  RuleType,
  AlertInstanceContext,
  AlertExecutorOptions,
} from '../../../../plugins/alerting/server';

import { RuleProducer, SqlRuleId, SqlRuleActionGroupId, SqlRuleName } from '../../common';

type Params = TypeOf<typeof ParamsSchema>;

const ParamsSchema = schema.object({
  query: schema.string(),
});

interface ActionContext extends AlertInstanceContext {
  message: string;
}

type ExecutorOptions = AlertExecutorOptions<
  Params,
  {},
  {},
  ActionContext,
  typeof SqlRuleActionGroupId
>;

type SqlRuleType = RuleType<Params, never, {}, {}, ActionContext, typeof SqlRuleActionGroupId>;

export function getRuleTypeSql(logger: Logger): SqlRuleType {
  return {
    id: SqlRuleId,
    name: SqlRuleName,
    actionGroups: [{ id: SqlRuleActionGroupId, name: SqlRuleActionGroupId }],
    executor: (options: ExecutorOptions) => executor(logger, options),
    defaultActionGroupId: SqlRuleActionGroupId,
    validate: {
      params: ParamsSchema,
    },
    actionVariables: {
      context: [{ name: 'message', description: 'A pre-constructed message for the alert.' }],
      params: [{ name: 'query', description: 'SQL query to run.' }],
    },
    minimumLicenseRequired: 'basic',
    isExportable: true,
    producer: RuleProducer,
    doesSetRecoveryContext: true,
  };
}

async function executor(logger: Logger, options: ExecutorOptions) {
  const { services, params } = options;
  const { alertFactory, scopedClusterClient } = services;

  const result = await scopedClusterClient.asCurrentUser.sql.query({
    format: 'json',
    query: params.query,
  });

  const objects = sqlResultToObjects(result);

  for (const object of objects) {
    alertFactory.create(object.instanceId).scheduleActions(SqlRuleActionGroupId, object);
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
