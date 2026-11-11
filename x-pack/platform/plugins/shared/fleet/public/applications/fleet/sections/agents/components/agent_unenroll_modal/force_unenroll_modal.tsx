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
import { KbnWarningCallout } from '@kbn/ui-callout';

import type { Agent } from '../../../../types';
import { useStartServices } from '../../../../hooks';

import { useUnenrollAgents } from './use_unenroll_agents';

interface Props {
  onClose: () => void;
  agents: Agent[] | string;
  agentCount: number;
  hasFleetServer?: boolean;
}

export const AgentForceUnenrollModal: React.FunctionComponent<Props> = ({
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
    revoke: true,
    onClose,
  });

  const learnMore = (
    <EuiLink href={docLinks.links.fleet.unenrollElasticAgent} target="_blank" external>
      <FormattedMessage
        id="xpack.fleet.forceUnenrollAgents.learnMoreLink"
        defaultMessage="Learn more"
      />
    </EuiLink>
  );

  return (
    <EuiConfirmModal
      data-test-subj="agentForceUnenrollModal"
      aria-labelledby={confirmModalTitleId}
      title={
        isSingleAgent ? (
          <FormattedMessage
            id="xpack.fleet.forceUnenrollAgents.deleteSingleTitle"
            defaultMessage="Force unenroll agent"
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.forceUnenrollAgents.deleteMultipleTitle"
            defaultMessage="Force unenroll {count} agents"
            values={{ count: agentCount }}
          />
        )
      }
      titleProps={{ id: confirmModalTitleId }}
      onCancel={onClose}
      onConfirm={onSubmit}
      cancelButtonText={
        <FormattedMessage
          id="xpack.fleet.forceUnenrollAgents.cancelButtonLabel"
          defaultMessage="Cancel"
        />
      }
      confirmButtonDisabled={isSubmitting}
      confirmButtonText={
        isSingleAgent ? (
          <FormattedMessage
            id="xpack.fleet.forceUnenrollAgents.confirmSingleButtonLabel"
            defaultMessage="Force unenroll agent"
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.forceUnenrollAgents.confirmMultipleButtonLabel"
            defaultMessage="Force unenroll {count} agents"
            values={{ count: agentCount }}
          />
        )
      }
      buttonColor="danger"
    >
      {hasFleetServer ? (
        <>
          <KbnWarningCallout
            announceOnMount
            title={
              isSingleAgent
                ? i18n.translate('xpack.fleet.forceUnenrollAgents.fleetServerTitle', {
                    defaultMessage: 'This agent is running Fleet Server',
                  })
                : i18n.translate('xpack.fleet.forceUnenrollAgents.fleetServerMultipleTitle', {
                    defaultMessage: 'Some of these agents are running Fleet Server',
                  })
            }
            text={
              isSingleAgent ? (
                <FormattedMessage
                  id="xpack.fleet.forceUnenrollAgents.fleetServerDescription"
                  defaultMessage="Force unenrolling this agent will disconnect a Fleet Server and prevent agents from sending data if no other Fleet Servers exist."
                />
              ) : (
                <FormattedMessage
                  id="xpack.fleet.forceUnenrollAgents.fleetServerMultipleDescription"
                  defaultMessage="Force unenrolling them will disconnect those Fleet Servers and prevent agents from sending data if no other Fleet Servers exist."
                />
              )
            }
          />
          <EuiSpacer />
        </>
      ) : null}
      <KbnWarningCallout
        title={
          isSingleAgent
            ? i18n.translate('xpack.fleet.forceUnenrollAgents.notNotifiedSingleTitle', {
                defaultMessage: 'This action does not notify the agent of unenrollment',
              })
            : i18n.translate('xpack.fleet.forceUnenrollAgents.notNotifiedMultipleTitle', {
                defaultMessage: 'This action does not notify the agents of unenrollment',
              })
        }
        text={
          isSingleAgent ? (
            <FormattedMessage
              id="xpack.fleet.forceUnenrollAgents.whenToUseSingleDescription"
              defaultMessage="Use this if the agent is stuck offline or in a compromised state. Otherwise, use Unenroll agent or Uninstall agent."
            />
          ) : (
            <FormattedMessage
              id="xpack.fleet.forceUnenrollAgents.whenToUseMultipleDescription"
              defaultMessage="Use this if the agents are stuck offline or in a compromised state. Otherwise, use Unenroll agents or Uninstall agent."
            />
          )
        }
      />
      <EuiSpacer />
      <p>
        <FormattedMessage
          id="xpack.fleet.forceUnenrollAgents.consequencesDescription"
          defaultMessage="Revokes {count, plural, one {the agent's} other {the agents''}} local API keys and marks {count, plural, one {it} other {them}} Unenrolled in Fleet.
            {count, plural, one {The agent} other {The agents}} will keep running on {count, plural, one {the host} other {their hosts}} and can keep sending data to any
            output that does not use the revoked keys until {count, plural, one {it is} other {they are}} uninstalled there. {count, plural, one {It} other {They}} cannot be
            uninstalled remotely afterwards, and Fleet will not register a later manual uninstall. {learnMore}"
          values={{ count: agentCount, learnMore }}
        />
      </p>
    </EuiConfirmModal>
  );
};
