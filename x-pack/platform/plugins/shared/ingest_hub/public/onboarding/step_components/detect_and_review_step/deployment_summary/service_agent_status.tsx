/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useState } from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiLoadingSpinner, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  LazyAgentHealth,
  LazyAgentlessEnrollmentFlyout,
  LazyAgentlessStatusDetailsFlyout,
} from '@kbn/fleet-plugin/public';
import type { AwsServiceMatrixEntry, DeploymentMethod } from '../../../aws_service_matrix';
import type { AgentIssue } from '../agent_detection';
import type { ServiceAgentInfo } from '../use_service_data_detection';

interface ServiceAgentStatusProps {
  /** Display name of the service, used as the flyout title. */
  name: string;
  entry: AwsServiceMatrixEntry;
  deploymentMethod: DeploymentMethod;
  agentInfo: ServiceAgentInfo;
}

type FlyoutKind = 'details' | 'enrollment';

const buttonResetCss = css({
  background: 'none',
  border: 0,
  padding: 0,
  cursor: 'pointer',
  font: 'inherit',
});

const getFlyoutKind = ({
  hasAgent,
  isUnhealthy,
  hasPackagePolicy,
  canShowEnrollment,
}: {
  hasAgent: boolean;
  isUnhealthy: boolean;
  hasPackagePolicy: boolean;
  canShowEnrollment: boolean;
}): FlyoutKind | undefined => {
  if (hasAgent) return isUnhealthy && hasPackagePolicy ? 'details' : undefined;
  return canShowEnrollment ? 'enrollment' : undefined;
};

const getIssueMessage = (issue: AgentIssue): string => {
  if (issue.type === 'not_running') {
    return i18n.translate('xpack.ingestHub.detectAndReviewStep.agentStatus.notRunning', {
      defaultMessage: "The agent isn't running this integration.",
    });
  }
  const { agentVersion, minVersion, integrations } = issue;
  const names = integrations.join(', ');
  return minVersion
    ? i18n.translate('xpack.ingestHub.detectAndReviewStep.agentStatus.upgradeToVersion', {
        defaultMessage:
          'Upgrade the agent to {minVersion} or later to run {names}. This agent is on {agentVersion}.',
        values: { minVersion, names, agentVersion },
      })
    : i18n.translate('xpack.ingestHub.detectAndReviewStep.agentStatus.upgradeAgent', {
        defaultMessage:
          "This agent is on {agentVersion}, which can't run {names}. Upgrade the agent.",
        values: { agentVersion, names },
      });
};

/**
 * Fleet agent badge for a service deployed through Fleet. An unhealthy agent opens its component
 * health, and a managed integration whose agent is not there yet opens the enrollment status —
 * the same flyouts the Managed integrations table uses.
 */
export function ServiceAgentStatus({
  name,
  entry,
  deploymentMethod,
  agentInfo,
}: ServiceAgentStatusProps) {
  const [openFlyout, setOpenFlyout] = useState<FlyoutKind | undefined>();
  const { agent, agentPolicy, packagePolicy, policyId, health, issue } = agentInfo;
  const packageVersion = packagePolicy?.package?.version;

  const flyoutKind = getFlyoutKind({
    hasAgent: !!agent,
    isUnhealthy: health === 'unhealthy',
    hasPackagePolicy: !!packagePolicy,
    canShowEnrollment: deploymentMethod === 'managed_integration' && !!packageVersion,
  });
  const close = () => setOpenFlyout(undefined);

  // Fleet reports an agent that cannot run the integration as Healthy. Show it as the Unhealthy
  // it is for this deployment, so the badge does not contradict the tile.
  const badgeAgent = agent && issue ? { ...agent, status: 'degraded' as const } : agent;

  const badge = badgeAgent ? (
    <Suspense fallback={<EuiLoadingSpinner size="s" />}>
      <LazyAgentHealth agent={badgeAgent} hideTooltip={!!flyoutKind} />
    </Suspense>
  ) : (
    <EuiBadge color="hollow" data-test-subj="serviceTile-agentPendingBadge">
      <FormattedMessage
        id="xpack.ingestHub.detectAndReviewStep.agentStatus.pending"
        defaultMessage="Pending"
      />
    </EuiBadge>
  );

  return (
    <div data-test-subj="serviceTile-agentStatus">
      {flyoutKind ? (
        <EuiToolTip
          position="top"
          content={
            <>
              {issue && <p>{getIssueMessage(issue)}</p>}
              <p>
                {i18n.translate('xpack.ingestHub.detectAndReviewStep.agentStatus.seeAgentInfo', {
                  defaultMessage: 'See agent info',
                })}
              </p>
            </>
          }
        >
          <button
            type="button"
            css={buttonResetCss}
            onClick={() => setOpenFlyout(flyoutKind)}
            data-test-subj="serviceTile-agentStatusButton"
          >
            {badge}
          </button>
        </EuiToolTip>
      ) : (
        badge
      )}

      {openFlyout === 'details' && agent && packagePolicy && (
        <Suspense fallback={null}>
          <LazyAgentlessStatusDetailsFlyout
            onClose={close}
            policyName={name}
            agent={agent}
            agentPolicy={agentPolicy}
            packagePolicy={packagePolicy}
          />
        </Suspense>
      )}
      {openFlyout === 'enrollment' && packageVersion && (
        <Suspense fallback={null}>
          <LazyAgentlessEnrollmentFlyout
            onClose={close}
            policyId={policyId}
            policyName={name}
            packageInfo={{ name: entry.packageName, version: packageVersion }}
            agentPolicy={agentPolicy}
            packagePolicy={packagePolicy}
          />
        </Suspense>
      )}
    </div>
  );
}
