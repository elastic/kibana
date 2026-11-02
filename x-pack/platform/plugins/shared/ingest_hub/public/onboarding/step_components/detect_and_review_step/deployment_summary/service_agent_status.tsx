/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useState } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  LazyAgentlessEnrollmentFlyout,
  LazyAgentlessStatusDetailsFlyout,
  LazyAgentStatusBadge,
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

const getBadgeTestSubj = ({
  hasAgent,
  isClickable,
}: {
  hasAgent: boolean;
  isClickable: boolean;
}): string | undefined => {
  if (isClickable) return 'serviceTile-agentStatusButton';
  return hasAgent ? undefined : 'serviceTile-agentPendingBadge';
};

const getFlyoutKind = ({
  hasAgent,
  isSettled,
  hasPackagePolicy,
  canShowEnrollment,
}: {
  hasAgent: boolean;
  /** The agent is healthy or unhealthy, as opposed to still enrolling or starting. */
  isSettled: boolean;
  hasPackagePolicy: boolean;
  canShowEnrollment: boolean;
}): FlyoutKind | undefined => {
  if (hasAgent) return isSettled && hasPackagePolicy ? 'details' : undefined;
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
 * Fleet agent badge for a service deployed through Fleet. A healthy or unhealthy agent opens its
 * component health, and a managed integration whose agent is not there yet opens the enrollment
 * status — the same flyouts the Managed integrations table uses.
 */
export function ServiceAgentStatus({
  name,
  entry,
  deploymentMethod,
  agentInfo,
}: ServiceAgentStatusProps) {
  const [openFlyout, setOpenFlyout] = useState<FlyoutKind | undefined>();
  const {
    agent,
    agentPolicy,
    packagePolicy,
    policyId,
    health,
    issue,
    unhealthyElsewhere,
    isIncomplete,
  } = agentInfo;
  const packageVersion = packagePolicy?.package?.version;

  // With the agent list cut short, the agent seen is not the whole picture: show Pending, and open
  // nothing, since the enrollment flyout would claim an agent that does exist is missing.
  const flyoutKind = isIncomplete
    ? undefined
    : getFlyoutKind({
        hasAgent: !!agent,
        isSettled: health === 'healthy' || health === 'unhealthy',
        hasPackagePolicy: !!packagePolicy,
        canShowEnrollment: deploymentMethod === 'managed_integration' && !!packageVersion,
      });
  const close = () => setOpenFlyout(undefined);
  // The badge is Fleet's view of the whole agent. When it is unhealthy only because of other
  // integrations, say so, so it does not read as a contradiction of this one running.
  const elsewhereMessage =
    unhealthyElsewhere && health === 'healthy'
      ? i18n.translate('xpack.ingestHub.detectAndReviewStep.agentStatus.unhealthyElsewhere', {
          defaultMessage:
            'The agent reports problems with other integrations. This one is running.',
        })
      : undefined;

  // Fleet reports an agent that cannot run the integration as Healthy. Show it as the Unhealthy
  // it is for this deployment, so the badge does not contradict the tile.
  const badgeAgent = (() => {
    if (isIncomplete) return undefined;
    return agent && issue ? { ...agent, status: 'degraded' as const } : agent;
  })();

  // Said in the badge's own check-in tooltip, so the last check-in stays visible for every status.
  const tooltipExtraContent =
    issue || flyoutKind || elsewhereMessage ? (
      <>
        {issue && <p>{getIssueMessage(issue)}</p>}
        {elsewhereMessage && <p>{elsewhereMessage}</p>}
        {flyoutKind && (
          <p>
            {i18n.translate('xpack.ingestHub.detectAndReviewStep.agentStatus.seeAgentInfo', {
              defaultMessage: 'See agent info',
            })}
          </p>
        )}
      </>
    ) : undefined;

  const badge = (
    <Suspense fallback={<EuiLoadingSpinner size="s" />}>
      <LazyAgentStatusBadge
        agent={badgeAgent}
        tooltipExtraContent={tooltipExtraContent}
        onClick={flyoutKind ? () => setOpenFlyout(flyoutKind) : undefined}
        data-test-subj={getBadgeTestSubj({ hasAgent: !!badgeAgent, isClickable: !!flyoutKind })}
      />
    </Suspense>
  );

  return (
    <div data-test-subj="serviceTile-agentStatus">
      {!flyoutKind && elsewhereMessage ? (
        <span tabIndex={0} data-test-subj="serviceTile-agentUnhealthyElsewhere">
          {badge}
        </span>
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
