/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiHorizontalRule
} from '@elastic/eui';
import React from 'react';
import { ApmHeader } from '../../shared/ApmHeader';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { useAgentName } from '../../../hooks/useAgentName';
import { ServiceMetrics } from '../ServiceMetrics';

export function ServiceNodeMetrics() {
  const { urlParams } = useUrlParams();
  const { serviceName, serviceNodeName } = urlParams;

  const { agentName } = useAgentName();

  return (
    <div>
      <ApmHeader>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h1>{serviceName}</h1>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </ApmHeader>
      <EuiHorizontalRule margin="m" />
      {agentName && serviceNodeName && <ServiceMetrics agentName={agentName} />}
    </div>
  );
}
