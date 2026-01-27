/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';

import type { Agent, PackagePolicy } from '../../../../../types';

import { getOutputUnitsByPackageAndInputType, InputStatusFormatter } from './input_status_utils';
import { AgentDetailsIntegrationStatus } from './agent_details_integration_status';

export const AgentDetailsIntegrationOutputs: React.FunctionComponent<{
  agent: Agent;
  packagePolicy: PackagePolicy;
  linkToLogs?: boolean;
  'data-test-subj'?: string;
}> = memo(({ agent, packagePolicy, linkToLogs = true, 'data-test-subj': dataTestSubj }) => {
  const outputStatusMap = useMemo(
    () =>
      packagePolicy.inputs.reduce((acc, current) => {
        if (!agent.components) {
          return new Map<string, InputStatusFormatter>();
        }
        if (current.enabled) {
          const agentUnit = getOutputUnitsByPackageAndInputType(
            agent.components,
            packagePolicy,
            current.type
          );

          acc.set(
            current.type,
            agentUnit
              ? new InputStatusFormatter(agentUnit.status, agentUnit.message)
              : new InputStatusFormatter()
          );
        }
        return acc;
      }, new Map<string, InputStatusFormatter>()),
    [agent.components, packagePolicy]
  );

  return (
    <AgentDetailsIntegrationStatus
      agent={agent}
      packagePolicy={packagePolicy}
      itemStatusMap={outputStatusMap}
      itemType="Output"
      linkToLogs={linkToLogs}
      data-test-subj={dataTestSubj}
    />
  );
});
