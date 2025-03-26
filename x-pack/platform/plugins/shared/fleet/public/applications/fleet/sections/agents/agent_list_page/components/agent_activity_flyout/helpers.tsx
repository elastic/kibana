/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedDate, FormattedMessage, FormattedTime } from '@kbn/i18n-react';
import { EuiIconTip, EuiProgress, EuiText, EuiTitle } from '@elastic/eui';

import type { ActionStatus } from '../../../../../types';

const actionNames: {
  [key: string]: { inProgressText: string; completedText: string; cancelledText: string };
} = {
  POLICY_REASSIGN: {
    inProgressText: 'Reassigning',
    completedText: 'assigned to a new policy',
    cancelledText: 'assignment',
  },
  UPGRADE: { inProgressText: 'Upgrading', completedText: 'upgraded', cancelledText: 'upgrade' },
  UNENROLL: {
    inProgressText: 'Unenrolling',
    completedText: 'unenrolled',
    cancelledText: 'unenrollment',
  },
  FORCE_UNENROLL: {
    inProgressText: 'Force unenrolling',
    completedText: 'force unenrolled',
    cancelledText: 'force unenrollment',
  },
  AUTOMATIC_FORCE_UNENROLL: {
    inProgressText: 'Automatic unenrolling',
    completedText: 'automatically unenrolled',
    cancelledText: 'automatic unenrollment',
  },
  UPDATE_TAGS: {
    inProgressText: 'Updating tags of',
    completedText: 'updated tags',
    cancelledText: 'update tags',
  },
  CANCEL: { inProgressText: 'Cancelling', completedText: 'cancelled', cancelledText: '' },
  REQUEST_DIAGNOSTICS: {
    inProgressText: 'Requesting diagnostics for',
    completedText: 'requested diagnostics',
    cancelledText: 'request diagnostics',
  },
  SETTINGS: {
    inProgressText: 'Updating settings of',
    completedText: 'updated settings',
    cancelledText: 'update settings',
  },
  POLICY_CHANGE: {
    inProgressText: 'Applying policy change on',
    completedText: 'applied policy change',
    cancelledText: 'policy change',
  },
  INPUT_ACTION: {
    inProgressText: 'Input action in progress of',
    completedText: 'input action completed',
    cancelledText: 'input action',
  },
  ACTION: { inProgressText: 'Actioning', completedText: 'actioned', cancelledText: 'action' },
};

export const getAction = (type?: string, actionId?: string) => {
  // handling a special case of force unenrollment coming from an automatic task
  // we know what kind of action is from the actionId prefix
  if (actionId?.includes('UnenrollInactiveAgentsTask-'))
    return actionNames.AUTOMATIC_FORCE_UNENROLL;
  return actionNames[type ?? 'ACTION'] ?? actionNames.ACTION;
};

export const inProgressTitle = (action: ActionStatus, totalAgents?: number) => (
  <FormattedMessage
    id="xpack.fleet.agentActivity.inProgressTitle"
    defaultMessage="{inProgressText} {nbAgents} {agents}{policyText}{reassignText}{upgradeText}{failuresText}"
    values={{
      nbAgents:
        action.nbAgentsAck >= action.nbAgentsActioned
          ? action.nbAgentsAck
          : action.is_automatic && totalAgents
          ? Math.round((action.nbAgentsActioned / totalAgents) * 100) + '% of ' + totalAgents
          : action.nbAgentsAck === 0
          ? action.nbAgentsActioned
          : action.nbAgentsActioned - action.nbAgentsAck + ' of ' + action.nbAgentsActioned,
      agents: action.nbAgentsActioned === 1 ? 'agent' : 'agents',
      inProgressText: getAction(action.type, action.actionId).inProgressText,
      policyText: action.is_automatic ? ' in policy ' : '',
      reassignText:
        action.type === 'POLICY_REASSIGN' && action.newPolicyId ? `to ${action.newPolicyId}` : '',
      upgradeText: action.type === 'UPGRADE' ? ` to version ${action.version}` : '',
      failuresText: action.nbAgentsFailed > 0 ? `, has ${action.nbAgentsFailed} failure(s)` : '',
    }}
  />
);

export const automaticUpgradeTitle = (action: ActionStatus, totalAgents: number) => (
  <EuiText>
    <EuiTitle>
      <h3>
        Upgrade to {action.version} (total in policy: {totalAgents}){' '}
      </h3>
    </EuiTitle>
    <EuiProgress
      color="primary"
      label={
        <EuiText color="subdued" size="s">
          <FormattedMessage
            id="xpack.fleet.agentActivityFlyout.automaticUpgradeTitle"
            defaultMessage="Target: {percentage}% of {agentsText} {tooltip}"
            values={{
              percentage: ((action.nbAgentsActioned / totalAgents) * 100).toFixed(0),
              agentsText: totalAgents === 1 ? 'agent' : 'agents',
              tooltip: (
                <EuiIconTip
                  title="Agents Selected For Upgrade"
                  content="We'll automatically retry any upgrade that fails"
                  type="iInCircle"
                />
              ),
            }}
          />
        </EuiText>
      }
      value={action.nbAgentsAck}
      max={action.nbAgentsActioned}
      valueText={
        <EuiText
          color="primary"
          size="s"
        >{`${action.nbAgentsAck} of ${action.nbAgentsActioned} upgraded`}</EuiText>
      }
    />
  </EuiText>
);

export const inProgressDescription = (time?: string) => (
  <FormattedMessage
    id="xpack.fleet.agentActivityFlyout.startedDescription"
    defaultMessage="Started on {date}."
    values={{
      date: formattedTime(time),
    }}
  />
);

export const formattedTime = (time?: string) => {
  return time ? (
    <>
      <FormattedDate value={time} year="numeric" month="short" day="2-digit" />
      &nbsp;
      <FormattedTime value={time} />
    </>
  ) : null;
};
