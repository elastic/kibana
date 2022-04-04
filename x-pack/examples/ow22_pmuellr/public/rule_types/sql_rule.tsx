/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTextArea, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { AlertTypeParams } from '../../../../plugins/alerting/common';
import {
  RuleTypeModel,
  RuleTypeParamsExpressionProps,
} from '../../../../plugins/triggers_actions_ui/public';
import { SqlRuleId, SqlRuleDescription } from '../../common';

const DefaultQuery = `
SELECT 
  TOP 10 
  host.name AS instanceId, 
  AVG(system.cpu.total.norm.pct) AS cpu, 
  AVG(system.memory.actual.free) AS freemem 
FROM "es-apm-sys-sim" 
WHERE 
  ("@timestamp" > (NOW() - INTERVAL 5 SECONDS)) 
GROUP BY host.name 
HAVING 
  AVG(system.cpu.total.norm.pct) > 0.80
`;

interface Params extends AlertTypeParams {
  query?: string;
}

export function getRuleType(): RuleTypeModel {
  return {
    id: SqlRuleId,
    description: SqlRuleDescription,
    iconClass: 'bolt',
    documentationUrl: null,
    ruleParamsExpression: SqlRuleExpression,
    requiresAppContext: false,
    validate: (params: Params) => {
      const validationResult = {
        errors: {
          query: new Array<string>(),
        },
      };
      return validationResult;
    },
  };
}

export const SqlRuleExpression: React.FunctionComponent<RuleTypeParamsExpressionProps<Params>> = ({
  ruleParams,
  setRuleParams,
  actionGroups,
  defaultActionGroupId,
}) => {
  const { query = DefaultQuery } = ruleParams;

  return (
    <Fragment>
      <EuiFlexGroup gutterSize="s" wrap direction="column">
        <EuiFlexItem grow={true}>
          <EuiFormRow label="Query" helpText="Enter the SQL query here">
            <EuiTextArea
              value={query}
              onChange={(event) => {
                setRuleParams('query', event.target.value);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
    </Fragment>
  );
};
