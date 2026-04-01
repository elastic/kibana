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
import satisfies from 'semver/functions/satisfies';

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

    const agentVersion: string | undefined = agent?.local_metadata?.elastic?.agent?.version;
    const incompatibleIntegrations =
      agentVersion && policy.package_agent_version_conditions
        ? policy.package_agent_version_conditions.filter(({ version_condition }) => {
            try {
              return !satisfies(agentVersion, version_condition);
            } catch {
              return false;
            }
          })
        : [];
    const showIncompatibilityBadge =
      incompatibleIntegrations.length > 0 && Boolean(policy.min_agent_version);

    if (agent?.type === 'OPAMP') {
      return <EuiText>-</EuiText>;
    }

    const warnings: Array<{ label: string; description: string }> = [];
    if (isOutdated) {
      warnings.push({
        label: i18n.translate('xpack.fleet.agentPolicySummaryLine.outdatedPolicyWarning', {
          defaultMessage: 'Outdated policy',
        }),
        description: i18n.translate(
          'xpack.fleet.agentPolicySummaryLine.outdatedPolicyWarningExpanded',
          {
            defaultMessage:
              "This agent isn't synced to the latest policy revision. Check its connection to the Fleet server.",
          }
        ),
      });
    }
    if (showIncompatibilityBadge) {
      warnings.push({
        label: i18n.translate('xpack.fleet.agentPolicySummaryLine.incompatibleIntegrationsLabel', {
          defaultMessage: 'Incompatible integrations',
        }),
        description: i18n.translate(
          'xpack.fleet.agentPolicySummaryLine.incompatibleIntegrationsTooltip',
          {
            defaultMessage:
              'This policy contains the following incompatible integrations: {integrations}. Upgrade the agent to {minVersion} or later.',
            values: {
              integrations: incompatibleIntegrations
                .map(({ title, name: pkgName }) => title || pkgName)
                .join(', '),
              minVersion: policy.min_agent_version,
            },
          }
        ),
      });
    }

    return (
      <EuiFlexGroup direction="column" gutterSize="xs" css={MIN_WIDTH}>
        {/* Row 1: small icon tips (left) + policy name (full width) */}
        <EuiFlexItem css={MIN_WIDTH}>
          <EuiFlexGroup
            direction={direction}
            gutterSize={direction === 'column' ? 'none' : 's'}
            alignItems="baseline"
            css={MIN_WIDTH}
            responsive={false}
            justifyContent="flexStart"
            wrap={false}
          >
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
                className="eui-textBreakWord"
                href={getHref('policy_details', { policyId: id })}
                title={policyDisplayName}
                data-test-subj="agentPolicyNameLink"
              >
                {policyDisplayName}
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {/* Row 2: revision (left) + warnings (right) */}
        {(revision || warnings.length > 0) && (
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={false}>
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
              {warnings.length > 0 && (
                <EuiFlexItem grow={false}>
                  <EuiToolTip
                    content={
                      warnings.length === 1 ? (
                        warnings[0].description
                      ) : (
                        <>
                          {warnings.map((w) => (
                            <div key={w.label}>
                              <strong>{w.label}</strong>: {w.description}
                            </div>
                          ))}
                        </>
                      )
                    }
                  >
                    <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiIcon size="m" type="warning" color="warning" aria-hidden={true} />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText color="subdued" size="xs" className="eui-textNoWrap">
                          {warnings.length === 1 ? (
                            warnings[0].label
                          ) : (
                            <FormattedMessage
                              id="xpack.fleet.agentPolicySummaryLine.multipleWarnings"
                              defaultMessage="{count} warnings"
                              values={{ count: warnings.length }}
                            />
                          )}
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiToolTip>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
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
    );
  }
);
