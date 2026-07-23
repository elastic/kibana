/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiCallOut,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { MAX_FLYOUT_WIDTH } from '../../constants';
import type { Agent, AgentPolicy, PackagePolicy } from '../../types';
import { useStartServices } from '../../hooks';
import { AgentDetailsIntegration } from '../../applications/fleet/sections/agents/agent_details_page/components/agent_details/agent_details_integration';
import {
  getInputUnitsByPackage,
  getOutputUnitsByPackage,
} from '../../applications/fleet/sections/agents/agent_details_page/components/agent_details/input_status_utils';

export interface AgentlessStatusDetailsFlyoutProps {
  onClose: () => void;
  /** Display name shown in the flyout header. */
  policyName: string;
  /** The enrolled agentless agent whose integration health should be shown. */
  agent: Agent;
  /**
   * The agent policy associated with the agent. Must include `package_policies`
   * (use `useGetOneAgentPolicy` which expands them) so that
   * `AgentDetailsIntegration` can render the per-integration accordion.
   */
  agentPolicy?: AgentPolicy;
  /** The specific package policy whose health status to display. */
  packagePolicy: PackagePolicy;
}

/**
 * A minimal flyout that shows the health status of a single agentless integration.
 * Opened from the "Details" action in the agentless table's Actions (…) menu.
 */
export const AgentlessStatusDetailsFlyout: React.FunctionComponent<
  AgentlessStatusDetailsFlyoutProps
> = ({ onClose, policyName, agent, agentPolicy, packagePolicy }) => {
  const { docLinks } = useStartServices();

  const componentAlertLevel = useMemo(() => {
    const { components } = agent;
    if (!components) return null;
    const units = packagePolicy.inputs.flatMap((input) => {
      const inputId = input.id ?? packagePolicy.id;
      return [
        ...getInputUnitsByPackage(components, inputId),
        ...getOutputUnitsByPackage(components, inputId),
      ];
    });
    if (units.some((u) => u.status === 'FAILED')) return 'failed';
    if (units.some((u) => u.status === 'DEGRADED')) return 'degraded';
    return null;
  }, [agent, packagePolicy]);

  return (
    <EuiFlyout
      data-test-subj="agentlessStatusDetailsFlyout"
      onClose={onClose}
      maxWidth={MAX_FLYOUT_WIDTH}
      aria-labelledby="FleetAgentlessStatusDetailsFlyoutTitle"
    >
      <EuiFlyoutHeader hasBorder aria-labelledby="FleetAgentlessStatusDetailsFlyoutTitle">
        <EuiTitle size="m">
          <h2 id="FleetAgentlessStatusDetailsFlyoutTitle">
            {i18n.translate('xpack.fleet.agentlessStatusDetailsFlyout.title', {
              defaultMessage: '{policyName} — Status details',
              values: { policyName },
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {componentAlertLevel && (
          <>
            <EuiCallOut
              announceOnMount
              color={componentAlertLevel === 'failed' ? 'danger' : 'warning'}
              iconType="warning"
              title={
                componentAlertLevel === 'failed'
                  ? i18n.translate(
                      'xpack.fleet.agentlessStatusDetailsFlyout.failedComponentsWarning',
                      { defaultMessage: 'One or more components are in a failed state' }
                    )
                  : i18n.translate(
                      'xpack.fleet.agentlessStatusDetailsFlyout.degradedComponentsWarning',
                      { defaultMessage: 'One or more components are in a degraded state' }
                    )
              }
              data-test-subj="agentlessStatusDetailsFlyoutComponentsWarning"
            >
              {componentAlertLevel === 'failed' && (
                <EuiText size="s">
                  <p>
                    <FormattedMessage
                      id="xpack.fleet.agentlessStatusDetailsFlyout.componentWarning.helperText"
                      defaultMessage="{policyName} managed integration failed to establish. Check out the {troubleshootingGuideLink} for help."
                      values={{
                        policyName,
                        troubleshootingGuideLink: (
                          <EuiLink href={docLinks.links.fleet.troubleshooting} target="_blank">
                            <FormattedMessage
                              id="xpack.fleet.agentlessStatusDetailsFlyout.componentWarning.troubleshootingLinkLabel"
                              defaultMessage="troubleshooting guide"
                            />
                          </EuiLink>
                        ),
                      }}
                    />
                  </p>
                </EuiText>
              )}
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}
        {agentPolicy && packagePolicy && (
          <AgentDetailsIntegration
            agent={agent}
            agentPolicy={agentPolicy}
            packagePolicy={packagePolicy}
            linkToLogs={false}
          />
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexStart">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>
              <FormattedMessage
                id="xpack.fleet.agentlessStatusDetailsFlyout.closeFlyoutButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
