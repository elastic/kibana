/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CSSProperties } from 'react';
import React, { memo } from 'react';

import type { AgentPolicy, Agent } from '../../common/types';
import { useLink } from '../hooks';
const MIN_WIDTH: CSSProperties = { minWidth: 0 };
const NO_WRAP_WHITE_SPACE: CSSProperties = { whiteSpace: 'nowrap' };
const WRAP_WHITE_SPACE: CSSProperties = { whiteSpace: 'normal' };

export const AgentPolicySummaryLine = memo<{
  policy: AgentPolicy;
  agent?: Agent;
  direction?: 'column' | 'row';
  withDescription?: boolean;
}>(({ policy, agent, direction = 'row', withDescription = false }) => {
  const { getHref } = useLink();
  const { name, id, is_managed: isManaged, description } = policy;

  const revision = agent ? agent.policy_revision : policy.revision;
  return (
    <EuiFlexGroup direction="column" gutterSize="xs" wrap={true}>
      <EuiFlexItem>
        <EuiFlexGroup
          direction={direction}
          gutterSize={direction === 'column' ? 'none' : 's'}
          alignItems="baseline"
          style={MIN_WIDTH}
          responsive={false}
          justifyContent={'flexStart'}
        >
          <EuiFlexItem grow={false}>
            <EuiFlexGroup style={MIN_WIDTH} gutterSize="s" alignItems="baseline" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiLink
                  style={WRAP_WHITE_SPACE}
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
              <EuiText color="subdued" size="xs" style={NO_WRAP_WHITE_SPACE}>
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
  );
});
