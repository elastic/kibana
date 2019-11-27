/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n/react';
import { EuiHealth, EuiToolTip } from '@elastic/eui';
import { Agent } from '../../common/types/domain_data';

interface Props {
  agent: Agent;
}

const Status = {
  Online: (
    <EuiHealth color="success">
      <FormattedMessage id="xpack.fleet.agentHealth.onlineStatusText" defaultMessage="Online" />
    </EuiHealth>
  ),
  Offline: (
    <EuiHealth color="subdued">
      <FormattedMessage id="xpack.fleet.agentHealth.offlineStatusText" defaultMessage="Offline" />
    </EuiHealth>
  ),
  Inactive: (
    <EuiHealth color="subdued">
      <FormattedMessage id="xpack.fleet.agentHealth.inactiveStatusText" defaultMessage="Inactive" />
    </EuiHealth>
  ),
  Warning: (
    <EuiHealth color="warning">
      <FormattedMessage id="xpack.fleet.agentHealth.warningStatusText" defaultMessage="Error" />
    </EuiHealth>
  ),
  Error: (
    <EuiHealth color="danger">
      <FormattedMessage id="xpack.fleet.agentHealth.errorStatusText" defaultMessage="Error" />
    </EuiHealth>
  ),
};

function getStatusComponent(agent: Agent): React.ReactElement {
  switch (agent.status) {
    case 'error':
      return Status.Error;
    case 'inactive':
      return Status.Inactive;
    case 'offline':
      return Status.Offline;
    case 'warning':
      return Status.Warning;
    default:
      return Status.Online;
  }
}

export const AgentHealth: React.FC<Props> = ({ agent }) => {
  const { last_checkin: lastCheckIn } = agent;
  const msLastCheckIn = new Date(lastCheckIn || 0).getTime();

  return (
    <EuiToolTip
      position="top"
      content={
        msLastCheckIn ? (
          <FormattedMessage
            id="xpack.fleet.agentHealth.checkInTooltipText"
            defaultMessage="Last checked in {lastCheckIn}"
            values={{
              lastCheckIn: <FormattedRelative value={msLastCheckIn} />,
            }}
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.agentHealth.noCheckInTooltipText"
            defaultMessage="Never checked in"
          />
        )
      }
    >
      {getStatusComponent(agent)}
    </EuiToolTip>
  );
};
