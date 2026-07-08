/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexItem, EuiIconTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { i18n } from '@kbn/i18n';

import type { AgentPolicy, InMemoryPackagePolicy } from '../../../../../../types';
import { useLink, useAuthz } from '../../../../../../hooks';
import { PendingUpgradeReviewStatus } from '../../../installed_integrations/components/pending_upgrade_review_status';

import { useAgentlessPolicyUpgrade } from './use_agentless_policy_upgrade';

export const PackagePolicyUpgradeCell: React.FC<{
  packagePolicy: InMemoryPackagePolicy;
  agentPolicies: AgentPolicy[];
  from?: string;
  // Refetch callback used only for the agentless upgrade path (agentless row +
  // `disableAgentlessLegacyAPI`), so the deployments table refreshes after the upgrade.
  onUpgraded?: () => void;
}> = ({ packagePolicy, agentPolicies, from = 'integrations-policy-list', onUpgraded }) => {
  const { getHref } = useLink();
  const canWriteIntegrationPolicies = useAuthz().integrations.writeIntegrationPolicies;
  const { isAgentlessUpgrade, openModal, confirmModal } = useAgentlessPolicyUpgrade({
    packagePolicy,
    onUpgraded,
  });

  if (agentPolicies.length === 0 || !packagePolicy.hasUpgrade) {
    return null;
  }

  const review = packagePolicy.pendingUpgradeReview;

  if (packagePolicy.keepPoliciesUpToDate) {
    if (review && (!review.action || review.action === 'pending')) {
      return (
        <EuiFlexItem grow={false}>
          <PendingUpgradeReviewStatus
            pkgName={packagePolicy.package?.name ?? ''}
            pkgTitle={packagePolicy.package?.title ?? ''}
            pendingUpgradeReview={review}
          />
        </EuiFlexItem>
      );
    }
    return null;
  }

  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiIconTip
          type="warning"
          color="warning"
          content={i18n.translate(
            'xpack.fleet.policyDetails.packagePoliciesTable.upgradeAvailable',
            {
              defaultMessage: 'Upgrade to {version} available',
              values: {
                version: packagePolicy.upgradeVersion ?? '',
              },
            }
          )}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          size="s"
          minWidth="0"
          {...(isAgentlessUpgrade
            ? { onClick: openModal }
            : {
                href: `${getHref('upgrade_package_policy', {
                  policyId: agentPolicies[0].id,
                  packagePolicyId: packagePolicy.id,
                })}?from=${from}`,
              })}
          data-test-subj="integrationPolicyUpgradeBtn"
          isDisabled={!canWriteIntegrationPolicies}
        >
          <FormattedMessage
            id="xpack.fleet.policyDetails.packagePoliciesTable.upgradeButton"
            defaultMessage="Upgrade"
          />
        </EuiButton>
      </EuiFlexItem>
      {confirmModal}
    </>
  );
};
