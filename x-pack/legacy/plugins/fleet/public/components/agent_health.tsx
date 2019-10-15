/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n/react';
import { EuiHealth, EuiToolTip } from '@elastic/eui';
import {
  AGENT_TYPE_PERMANENT,
  AGENT_TYPE_TEMPORARY,
  AGENT_POLLING_THRESHOLD_MS,
} from '../../common/constants';
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
      <FormattedMessage id="xpack.fleet.agentHealth.errorStatusText" defaultMessage="Offline" />
    </EuiHealth>
  ),
};

export const AgentHealth: React.SFC<Props> = ({ agent }) => {
  // TODO: Use agent events as part of health calculation once we have them;
  // until then, we just use last check in time
  const { type, last_checkin: lastCheckIn } = agent;
  const msLastCheckIn = new Date(lastCheckIn || 0).getTime();
  const msSinceLastCheckIn = new Date().getTime() - msLastCheckIn;
  const intervalsSinceLastCheckIn = Math.floor(msSinceLastCheckIn / AGENT_POLLING_THRESHOLD_MS);

  let status: React.ReactElement = Status.Online;

  if (!agent.active) {
    status = Status.Inactive;
  } else {
    switch (type) {
      case AGENT_TYPE_PERMANENT:
        if (intervalsSinceLastCheckIn >= 4) {
          status = Status.Error;
          break;
        }
        if (intervalsSinceLastCheckIn >= 2) {
          status = Status.Warning;
          break;
        }
      case AGENT_TYPE_TEMPORARY:
        if (intervalsSinceLastCheckIn >= 3) {
          status = Status.Offline;
          break;
        }
    }
  }

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
      {status}
    </EuiToolTip>
  );
};
