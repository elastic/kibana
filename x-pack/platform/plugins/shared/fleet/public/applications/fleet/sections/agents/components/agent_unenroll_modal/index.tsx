/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiConfirmModal, EuiLink, EuiSpacer, useGeneratedHtmlId } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnInfoCallout, KbnWarningCallout } from '@kbn/ui-callout';

import { hasPendingUnenroll } from '../../../../../../../common/services/agent_status';

import type { Agent } from '../../../../types';
import { useStartServices } from '../../../../hooks';

import { useUnenrollAgents } from './use_unenroll_agents';

export { AgentForceUnenrollModal } from './force_unenroll_modal';

const isAgentOffline = ({ status }: Agent): boolean =>
  status === 'offline' || status === 'inactive';

interface Props {
  onClose: () => void;
  agents: Agent[] | string;
  agentCount: number;
  hasFleetServer?: boolean;
}

export const AgentUnenrollAgentModal: React.FunctionComponent<Props> = ({
  onClose,
  agents,
  agentCount,
  hasFleetServer = false,
}) => {
  const confirmModalTitleId = useGeneratedHtmlId();
  const { docLinks } = useStartServices();

  const { isSubmitting, isSingleAgent, onSubmit } = useUnenrollAgents({
    agents,
    agentCount,
    revoke: false,
    onClose,
  });

  // The bulk endpoint rejects agents that already have an unenroll pending, so report how many of
  // the selection that is. Not computable when the selection is a KQL query rather than a list.
  const pendingUnenrollCount = Array.isArray(agents)
    ? agents.filter((agent) => hasPendingUnenroll(agent)).length
    : 0;

  // An offline agent will not act on the unenroll until it checks in again. The status is a
  // snapshot from when the agents were loaded, so this only adapts the advice, never blocks.
  const offlineCount = Array.isArray(agents) ? agents.filter(isAgentOffline).length : 0;
  const isSingleAgentOffline = isSingleAgent && offlineCount === 1;

  const learnMore = (
    <EuiLink href={docLinks.links.fleet.unenrollElasticAgent} target="_blank" external>
      <FormattedMessage id="xpack.fleet.unenrollAgents.learnMoreLink" defaultMessage="Learn more" />
    </EuiLink>
  );

  return (
    <EuiConfirmModal
      data-test-subj="agentUnenrollModal"
      aria-labelledby={confirmModalTitleId}
      title={
        isSingleAgent ? (
          <FormattedMessage
            id="xpack.fleet.unenrollAgents.deleteSingleTitle"
            defaultMessage="Unenroll agent"
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.unenrollAgents.forceDeleteMultipleTitle"
            defaultMessage="Unenroll {count} agents"
            values={{ count: agentCount }}
          />
        )
      }
      titleProps={{ id: confirmModalTitleId }}
      onCancel={onClose}
      onConfirm={onSubmit}
      cancelButtonText={
        <FormattedMessage
          id="xpack.fleet.unenrollAgents.cancelButtonLabel"
          defaultMessage="Cancel"
        />
      }
      confirmButtonDisabled={isSubmitting}
      confirmButtonText={
        isSingleAgent ? (
          <FormattedMessage
            id="xpack.fleet.unenrollAgents.confirmSingleButtonLabel"
            defaultMessage="Unenroll agent"
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.unenrollAgents.confirmMultipleButtonLabel"
            defaultMessage="Unenroll {count} agents"
            values={{ count: agentCount }}
          />
        )
      }
      buttonColor="danger"
    >
      <p>
        {hasFleetServer && isSingleAgent ? (
          <>
            <KbnWarningCallout
              announceOnMount
              title={i18n.translate('xpack.fleet.unenrollAgents.unenrollFleetServerTitle', {
                defaultMessage: 'This agent is running Fleet Server',
              })}
              text={
                <FormattedMessage
                  id="xpack.fleet.unenrollAgents.unenrollFleetServerDescription"
                  defaultMessage="Unenrolling this agent will disconnect a Fleet Server and prevent agents from sending data if no other Fleet Servers exist."
                />
              }
            />
            <EuiSpacer />
          </>
        ) : null}
        {isSingleAgent ? (
          <FormattedMessage
            id="xpack.fleet.unenrollAgents.deleteSingleDescription"
            defaultMessage='This action will remove the selected agent running on "{hostName}" from Fleet.
              Any data that was already sent by the agent will not be deleted. This action cannot be undone.'
            values={{ hostName: ((agents[0] as Agent).local_metadata.host as any).hostname }}
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.unenrollAgents.deleteMultipleDescription"
            defaultMessage="This action will remove multiple agents from Fleet and prevent new data from being ingested.
              Any data that was already sent by these agents will not be affected. This action cannot be undone."
          />
        )}
        {!isSingleAgent && offlineCount > 0 ? (
          <>
            {' '}
            <FormattedMessage
              id="xpack.fleet.unenrollAgents.offlineCountDescription"
              defaultMessage="{count} of these agents {count, plural, one {appears} other {appear}} to be offline and will not unenroll until {count, plural, one {it checks} other {they check}} in."
              values={{ count: offlineCount }}
            />
          </>
        ) : null}
        {pendingUnenrollCount > 0 ? (
          <>
            {' '}
            <FormattedMessage
              id="xpack.fleet.unenrollAgents.pendingUnenrollCountDescription"
              defaultMessage="{count} of these agents {count, plural, one {already has} other {already have}} an unenroll pending and will not be affected."
              values={{ count: pendingUnenrollCount }}
            />
          </>
        ) : null}
      </p>
      {isSingleAgentOffline ? (
        <KbnWarningCallout
          title={i18n.translate('xpack.fleet.unenrollAgents.offlineAgentTitle', {
            defaultMessage: 'This agent appears to be offline',
          })}
          text={
            <FormattedMessage
              id="xpack.fleet.unenrollAgents.offlineAgentText"
              defaultMessage="Fleet waits for the agent to check in before unenrolling it. If the agent is stuck offline, use Force unenroll instead. {learnMore}"
              values={{ learnMore }}
            />
          }
        />
      ) : (
        <KbnInfoCallout
          title={
            isSingleAgent
              ? i18n.translate('xpack.fleet.unenrollAgents.forceUnenrollSignpostSingleTitle', {
                  defaultMessage: 'The agent must acknowledge this request',
                })
              : i18n.translate('xpack.fleet.unenrollAgents.forceUnenrollSignpostMultipleTitle', {
                  defaultMessage: 'Each agent must acknowledge this request',
                })
          }
          text={
            <FormattedMessage
              id="xpack.fleet.unenrollAgents.forceUnenrollSignpostText"
              defaultMessage="Fleet waits for {count, plural, one {the agent} other {each agent}} to check in before unenrolling it. If {count, plural, one {the agent is} other {any agents are}} stuck offline, use Force unenroll instead. {learnMore}"
              values={{ count: agentCount, learnMore }}
            />
          }
        />
      )}
    </EuiConfirmModal>
  );
};
