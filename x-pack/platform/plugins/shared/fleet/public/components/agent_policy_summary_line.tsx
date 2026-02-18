/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiLink,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { memo } from 'react';
import { css } from '@emotion/css';

import type { AgentPolicy, Agent } from '../../common/types';
import { useLink } from '../hooks';

const MIN_WIDTH = css`
  min-width: 0;
`;

export const AgentPolicySummaryLine = memo<{
  policy: AgentPolicy;
  agent?: Agent;
  direction?: 'column' | 'row';
  withDescription?: boolean;
  /** When true (e.g. in agent list/details), show policy id in parentheses: "Policy Name (policy_id)" */
  showPolicyId?: boolean;
  isVersionSpecific?: boolean;
}>(
  ({
    policy,
    agent,
    direction = 'row',
    withDescription = false,
    showPolicyId = false,
    isVersionSpecific = false,
  }) => {
    const { getHref } = useLink();
    const { name, id, is_managed: isManaged, description } = policy;
    const policyDisplayName = showPolicyId && name ? `${name} (${id})` : name || id;

    const revision = agent ? agent.policy_revision : policy.revision;
    const isOutdated = agent?.policy_revision && policy.revision > agent.policy_revision;

    return (
      <EuiFlexGroup gutterSize="m" css={MIN_WIDTH} alignItems="center">
        <EuiFlexItem grow={true} css={MIN_WIDTH}>
          <EuiFlexGroup direction="column" gutterSize="xs" wrap={true} css={MIN_WIDTH}>
            <EuiFlexItem>
              <EuiFlexGroup
                direction={direction}
                gutterSize={direction === 'column' ? 'none' : 's'}
                alignItems="baseline"
                css={MIN_WIDTH}
                responsive={false}
                justifyContent={'flexStart'}
                wrap={false}
              >
                {/* Icons at start so they stay visible in constrained layouts */}
                {(isVersionSpecific || isManaged) && (
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                      {isVersionSpecific && (
                        <EuiFlexItem grow={false}>
                          <EuiIconTip
                            type="info"
                            size="m"
                            color="subdued"
                            content={
                              <FormattedMessage
                                id="xpack.fleet.agentPolicySummaryLine.versionSpecificPolicyTooltip"
                                defaultMessage="This agent uses a version-specific policy because it doesn't meet the agent version requirements of some integrations."
                              />
                            }
                          />
                        </EuiFlexItem>
                      )}
                      {isManaged && (
                        <EuiFlexItem grow={false}>
                          <EuiIconTip
                            title="Hosted agent policy"
                            content={i18n.translate(
                              'xpack.fleet.agentPolicySummaryLine.hostedPolicyTooltip',
                              {
                                defaultMessage:
                                  'This policy is managed outside of Fleet. Most actions related to this policy are unavailable.',
                              }
                            )}
                            type="lock"
                            size="m"
                            color="subdued"
                          />
                        </EuiFlexItem>
                      )}
                    </EuiFlexGroup>
                  </EuiFlexItem>
                )}
                <EuiFlexItem grow={false} css={MIN_WIDTH}>
                  <EuiLink
                    className="eui-textBreakNormal"
                    href={getHref('policy_details', { policyId: id })}
                    title={policyDisplayName}
                    data-test-subj="agentPolicyNameLink"
                  >
                    {policyDisplayName}
                  </EuiLink>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            {/* Revision on its own row so it stays underneath and never goes off screen */}
            {revision && (
              <EuiFlexItem grow={false}>
                <EuiText color="subdued" size="xs" className="eui-textNoWrap">
                  <FormattedMessage
                    id="xpack.fleet.agentPolicySummaryLine.revisionNumber"
                    defaultMessage="rev. {revNumber}"
                    values={{ revNumber: revision }}
                  />
                </EuiText>
              </EuiFlexItem>
            )}
            {withDescription && description && (
              <EuiFlexItem>
                <EuiText color="subdued" title={description} size="xs">
                  {description}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        {isOutdated && (
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={
                <FormattedMessage
                  id="xpack.fleet.agentPolicySummaryLine.outdatedPolicyWarningExpanded"
                  defaultMessage="This agent isn't synced to the latest policy revision. Check its connection to the fleet server."
                />
              }
            >
              <EuiFlexGroup alignItems="center" gutterSize="xs">
                <EuiFlexItem>
                  <EuiIcon size="m" type="warning" color="warning" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText color="subdued" size="xs">
                    <FormattedMessage
                      id="xpack.fleet.agentPolicySummaryLine.outdatedPolicyWarning"
                      defaultMessage="Outdated policy"
                    />
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiToolTip>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
);
