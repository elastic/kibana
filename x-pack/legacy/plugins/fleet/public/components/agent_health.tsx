/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiHealth } from '@elastic/eui';

interface Props {
  agent: any;
}

export const AgentHealth: React.SFC<Props> = ({ agent }) => {
  if (agent.active) {
    return (
      <EuiHealth color="success">
        <FormattedMessage id="xpack.fleet.agentHealth.onlineStatusText" defaultMessage="Online" />
      </EuiHealth>
    );
  }
  return (
    <EuiHealth color="subdued">
      <FormattedMessage id="xpack.fleet.agentHealth.offlineStatusText" defaultMessage="Offline" />
    </EuiHealth>
  );
};
