/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiLink, EuiSpacer } from '@elastic/eui';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { Agent, AgentPolicy, PackagePolicy } from '../../types';
import { useStartServices } from '../../hooks';
import { AgentDetailsIntegration } from '../../applications/fleet/sections/agents/agent_details_page/components/agent_details/agent_details_integration';
import { getComponentAlertLevel } from './component_alert_level';

export { getComponentAlertLevel };
export type { ComponentAlertLevel } from './component_alert_level';

export interface AgentlessComponentHealthProps {
  /** Display name used in the callout text. */
  policyName: string;
  agent: Agent;
  /** Only `id` is read, for the agent policy link. The accordion is not rendered without it. */
  agentPolicy?: AgentPolicy;
  packagePolicy: PackagePolicy;
  /** Set to false when the caller already shows its own failure callout. */
  showCallout?: boolean;
}

/**
 * Component-level health (failed/degraded callout + per-integration breakdown) of a
 * single agentless integration.
 */
export const AgentlessComponentHealth: React.FunctionComponent<AgentlessComponentHealthProps> = ({
  policyName,
  agent,
  agentPolicy,
  packagePolicy,
  showCallout = true,
}) => {
  const { docLinks } = useStartServices();

  const componentAlertLevel = useMemo(
    () => getComponentAlertLevel(agent, packagePolicy),
    [agent, packagePolicy]
  );

  const CalloutComponent = componentAlertLevel === 'failed' ? KbnDangerCallout : KbnWarningCallout;

  return (
    <>
      {showCallout && componentAlertLevel && (
        <>
          <CalloutComponent
            announceOnMount
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
            text={
              componentAlertLevel === 'failed' ? (
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
              ) : undefined
            }
          />
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
    </>
  );
};
