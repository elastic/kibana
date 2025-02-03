/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiPanel, EuiText, EuiLink, EuiSpacer, EuiCallOut } from '@elastic/eui';

import type { Agent, AgentPolicy } from '../../types';
import { useStartServices } from '../../hooks';
import { AgentDetailsIntegrations } from '../../applications/fleet/sections/agents/agent_details_page/components/agent_details/agent_details_integrations';

export const AgentlessStepConfirmEnrollment = ({
  agent,
  agentPolicy,
  integrationTitle,
}: {
  agent?: Agent;
  agentPolicy?: AgentPolicy;
  integrationTitle: string;
}) => {
  const { docLinks } = useStartServices();
  const [overallState, setOverallState] = useState<'pending' | 'success' | 'failure'>('pending');

  // Calculate overall UI state from agent status
  useEffect(() => {
    if (agent && agent.status === 'online') {
      setOverallState('success');
    } else if (agent && (agent.status === 'error' || agent.status === 'degraded')) {
      setOverallState('failure');
    } else {
      setOverallState('pending');
    }
  }, [agent]);

  if (overallState === 'success') {
    return (
      <>
        <EuiCallOut
          color="success"
          title={i18n.translate(
            'xpack.fleet.agentlessEnrollmentFlyout.confirmEnrollment.successText',
            {
              defaultMessage: 'Agentless deployment was successful',
            }
          )}
          iconType="check"
        />
        <EuiSpacer size="m" />
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.fleet.agentlessEnrollmentFlyout.confirmEnrollment.successHelperText"
              defaultMessage="{integrationTitle} agentless integration has been successfully established. You can now seamlessly monitor and manage your {integrationTitle} resources without the need for any additional agents."
              values={{
                integrationTitle,
              }}
            />
          </p>
        </EuiText>
      </>
    );
  } else if (overallState === 'failure') {
    return (
      <>
        <EuiCallOut
          color="danger"
          title={i18n.translate(
            'xpack.fleet.agentlessEnrollmentFlyout.confirmEnrollment.failureText',
            {
              defaultMessage: 'Agentless deployment failed',
            }
          )}
          iconType="warning"
        >
          {agent?.last_checkin_message && <p>{agent.last_checkin_message}</p>}
        </EuiCallOut>
        <EuiSpacer size="m" />
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.fleet.agentlessEnrollmentFlyout.confirmEnrollment.failureHelperText"
              defaultMessage="{integrationTitle} agentless integration failed to establish. Check out the {troubleshootingGuideLink} for help."
              values={{
                integrationTitle,
                troubleshootingGuideLink: (
                  <EuiLink href={docLinks.links.fleet.troubleshooting} target="_blank">
                    <FormattedMessage
                      id="xpack.fleet.agentlessEnrollmentFlyout.confirmEnrollment.pendingHelperText.troubleshootingLinkLabel"
                      defaultMessage="troubleshooting guide"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>
        {agent && agentPolicy && (
          <>
            <EuiSpacer size="m" />
            <AgentDetailsIntegrations agent={agent} agentPolicy={agentPolicy} linkToLogs={false} />
          </>
        )}
      </>
    );
  }

  return (
    <>
      <EuiPanel color="subdued" paddingSize="xl" className="eui-textCenter">
        <EuiButton disabled={true} size="s" isLoading={true}>
          <FormattedMessage
            id="xpack.fleet.agentlessEnrollmentFlyout.confirmEnrollment.pendingText"
            defaultMessage="Listening for agentless connection... this could take several minutes"
          />
        </EuiButton>
      </EuiPanel>
      <EuiSpacer size="m" />
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.fleet.agentlessEnrollmentFlyout.confirmEnrollment.pendingHelperText"
            defaultMessage="Getting ready to connect with your cloud account and confirm incoming data. If you're having trouble connecting, check out the {troubleshootingGuideLink}. You can track the latest status from {policyPagePath} Status column."
            values={{
              troubleshootingGuideLink: (
                <EuiLink href={docLinks.links.fleet.troubleshooting} target="_blank">
                  <FormattedMessage
                    id="xpack.fleet.agentlessEnrollmentFlyout.confirmEnrollment.pendingHelperText.troubleshootingLinkLabel"
                    defaultMessage="troubleshooting guide"
                  />
                </EuiLink>
              ),
              policyPagePath: (
                <strong>
                  <FormattedMessage
                    id="xpack.fleet.agentlessEnrollmentFlyout.confirmEnrollment.pendingHelperText.policyPagePath"
                    defaultMessage="Integration policies &rarr; Agentless Integrations"
                  />
                </strong>
              ),
            }}
          />
        </p>
      </EuiText>
    </>
  );
};
