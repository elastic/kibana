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
import {
  getInputUnitsByPackage,
  getOutputUnitsByPackage,
} from '../../applications/fleet/sections/agents/agent_details_page/components/agent_details/input_status_utils';

export interface AgentlessComponentHealthProps {
  /** Display name used in the callout text. */
  policyName: string;
  agent: Agent;
  /** Must include `package_policies` so the per-integration accordion can render. */
  agentPolicy?: AgentPolicy;
  packagePolicy: PackagePolicy;
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
}) => {
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

  const CalloutComponent = componentAlertLevel === 'failed' ? KbnDangerCallout : KbnWarningCallout;

  return (
    <>
      {componentAlertLevel && (
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
