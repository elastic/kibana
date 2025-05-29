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
}>(({ policy, agent, direction = 'row', withDescription = false }) => {
  const { getHref } = useLink();
  const { name, id, is_managed: isManaged, description } = policy;

  const revision = agent ? agent.policy_revision : policy.revision;
  const isOutdated = agent?.policy_revision && policy.revision > agent.policy_revision;

  return (
    <EuiFlexGroup gutterSize="m" css={MIN_WIDTH} alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="column" gutterSize="xs" wrap={true}>
          <EuiFlexItem>
            <EuiFlexGroup
              direction={direction}
              gutterSize={direction === 'column' ? 'none' : 's'}
              alignItems="baseline"
              css={MIN_WIDTH}
              responsive={false}
              justifyContent={'flexStart'}
            >
              <EuiFlexItem grow={false}>
                <EuiFlexGroup
                  css={MIN_WIDTH}
                  gutterSize="s"
                  alignItems="baseline"
                  responsive={false}
                >
                  <EuiFlexItem grow={false}>
                    <EuiLink
                      className="eui-textBreakNormal"
                      href={getHref('policy_details', { policyId: id })}
                      title={name || id}
                      data-test-subj="agentPolicyNameLink"
                    >
                      {name || id}
                    </EuiLink>
                  </EuiFlexItem>

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
            </EuiFlexGroup>
          </EuiFlexItem>
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
});
