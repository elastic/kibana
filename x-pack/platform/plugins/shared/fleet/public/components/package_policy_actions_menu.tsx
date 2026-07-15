/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiContextMenuItem, EuiCopy, EuiPortal } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { MANAGEMENT_APP_ID } from '@kbn/deeplinks-management/constants';

import {
  EXCLUDED_FROM_PACKAGE_POLICY_COPY_PACKAGES,
  FLEET_CONNECTORS_PACKAGE,
  IS_AGENTLESS_QUERY_PARAM,
} from '../../common/constants';
import type { AgentPolicy, InMemoryPackagePolicy } from '../types';
import {
  useAgentPolicyRefresh,
  useAuthz,
  useGetOneAgentPolicy,
  useLink,
  useStartServices,
  useUpgradeReviewActions,
} from '../hooks';
import { isAgentlessPoliciesUIEnabled, policyHasFleetServer } from '../services';

import { scheduleAutoOpenModal } from '../applications/integrations/sections/epm/screens/installed_integrations/components/pending_upgrade_review_status';
import { useAgentlessPolicyUpgrade } from '../applications/integrations/sections/epm/screens/detail/policies/components/use_agentless_policy_upgrade';

import { AgentEnrollmentFlyout } from './agent_enrollment_flyout';
import { ContextMenuActions } from './context_menu_actions';
import { DangerEuiContextMenuItem } from './danger_eui_context_menu_item';
import { PackagePolicyDeleteProvider } from './package_policy_delete_provider';

const CONNECTORS_PATH = '/data/content_connectors/connectors';

export const PackagePolicyActionsMenu: React.FunctionComponent<{
  agentPolicies: AgentPolicy[];
  packagePolicy: InMemoryPackagePolicy;
  showAddAgent?: boolean;
  defaultIsOpen?: boolean;
  upgradePackagePolicyHref?: string;
  from?: 'fleet-policy-list' | 'installed-integrations' | undefined;
  // Called after a successful agentless upgrade so the caller can refetch its list. Only relevant
  // when the agentless upgrade action is used (agentless row + `disableAgentlessLegacyAPI`).
  onUpgraded?: () => void;
}> = ({
  agentPolicies,
  packagePolicy,
  showAddAgent,
  upgradePackagePolicyHref,
  defaultIsOpen = false,
  from,
  onUpgraded,
}) => {
  const [isEnrollmentFlyoutOpen, setIsEnrollmentFlyoutOpen] = useState(false);
  const { getHref } = useLink();
  const authz = useAuthz();

  const agentPolicy = agentPolicies.length > 0 ? agentPolicies[0] : undefined;
  const canWriteIntegrationPolicies = authz.integrations.writeIntegrationPolicies;
  const isFleetServerPolicy = agentPolicy && policyHasFleetServer(agentPolicy);

  const canAddAgents = isFleetServerPolicy ? authz.fleet.addFleetServers : authz.fleet.addAgents;
  const refreshAgentPolicy = useAgentPolicyRefresh();
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(defaultIsOpen);

  const { cloud, application } = useStartServices();

  const isManaged = Boolean(packagePolicy.is_managed);
  const agentPolicyIsManaged = Boolean(agentPolicy?.is_managed);
  const isOrphanedPolicy = !agentPolicy && packagePolicy.policy_ids.length === 0;
  const isAgentlessPolicy = packagePolicy.supports_agentless;

  const {
    isAgentlessUpgrade,
    openModal: openAgentlessUpgradeModal,
    confirmModal: agentlessUpgradeModal,
  } = useAgentlessPolicyUpgrade({ packagePolicy, onUpgraded });

  // For agentless policies the agentPolicies prop may be empty (the parent hook doesn't always
  // fetch them) or a minimal synthesized policy without `agentless` details (the agentless
  // deployments table). Fetch the agent policy directly so we can include cluster_id in the
  // support bundle.
  const agentlessPolicyId =
    isAgentlessPolicy && !agentPolicy?.agentless ? packagePolicy.policy_ids[0] : undefined;
  const { data: agentlessPolicyData } = useGetOneAgentPolicy(agentlessPolicyId);
  const effectiveAgentPolicy = agentPolicy?.agentless
    ? agentPolicy
    : agentlessPolicyData?.item ?? agentPolicy;

  const supportBundleText = useMemo(() => {
    if (!isAgentlessPolicy) return '';
    return [
      'elastic-support-bundle',
      cloud?.isServerlessEnabled && cloud?.serverless?.projectId
        ? `project_id=${cloud.serverless.projectId}`
        : null,
      !cloud?.isServerlessEnabled && cloud?.deploymentId
        ? `deployment_id=${cloud.deploymentId}`
        : null,
      effectiveAgentPolicy?.agentless?.cluster_id
        ? `cluster_id=${effectiveAgentPolicy.agentless.cluster_id}`
        : null,
      effectiveAgentPolicy?.id ?? packagePolicy.policy_ids[0]
        ? `policy_id=${effectiveAgentPolicy?.id ?? packagePolicy.policy_ids[0]}`
        : null,
      packagePolicy.package?.name ? `integration=${packagePolicy.package.name}` : null,
    ]
      .filter(Boolean)
      .join('\n');
  }, [
    isAgentlessPolicy,
    cloud,
    effectiveAgentPolicy,
    packagePolicy.policy_ids,
    packagePolicy.package?.name,
  ]);

  const isAddAgentVisible =
    showAddAgent && agentPolicy && !agentPolicyIsManaged && !agentPolicy?.supports_agentless;

  const onEnrollmentFlyoutClose = useMemo(() => {
    return () => setIsEnrollmentFlyoutOpen(false);
  }, []);
  const { handleReEnable: handleReviewUpgrade } = useUpgradeReviewActions({
    pkgName: packagePolicy.package?.name || '',
    pkgTitle: packagePolicy.package?.title || '',
    targetVersion: packagePolicy.pendingUpgradeReview?.target_version || '',
  });

  const isConnectorPolicy = packagePolicy.package?.name === FLEET_CONNECTORS_PACKAGE;
  const connectorId = packagePolicy.inputs
    .map((input) => input?.vars?.connector_id?.value)
    .find(Boolean);

  // Build the edit link query string once. For agentless policies we append an
  // isAgentless hint so the edit page reads/writes through the agentless API
  // instead of the package-policy API (detect-before-read). Orphaned (non-agentless)
  // policies keep editing a package policy, so the hint is only added when agentless.
  // The hint is suppressed when the agentless policies UI kill switch is off, so links
  // route through the legacy APIs (the pages also ignore the hint when the switch is off).
  const emitAgentlessHint = isAgentlessPolicy && isAgentlessPoliciesUIEnabled();
  const editQueryParams = new URLSearchParams();
  if (from) {
    editQueryParams.set('from', from);
  }
  if (emitAgentlessHint) {
    editQueryParams.set(IS_AGENTLESS_QUERY_PARAM, 'true');
  }
  const editQueryString = editQueryParams.toString();
  const editHref = `${
    isOrphanedPolicy || isAgentlessPolicy
      ? getHref('integration_policy_edit', {
          packagePolicyId: packagePolicy.id,
        })
      : getHref('edit_integration', {
          policyId: agentPolicy?.id ?? '',
          packagePolicyId: packagePolicy.id,
        })
  }${editQueryString ? `?${editQueryString}` : ''}`;

  // The copy flow reuses the create page. Agentless copies must read/hydrate through the
  // agentless API (detect-before-read), so carry the same isAgentless hint on the copy link.
  const copyQueryParams = new URLSearchParams();
  if (from) {
    copyQueryParams.set('from', from);
  }
  if (emitAgentlessHint) {
    copyQueryParams.set(IS_AGENTLESS_QUERY_PARAM, 'true');
  }
  const copyQueryString = copyQueryParams.toString();
  const copyHref = `${
    isOrphanedPolicy || isAgentlessPolicy
      ? getHref('integration_policy_copy', {
          policyId: agentPolicy?.id || '',
          packagePolicyId: packagePolicy.id,
        })
      : getHref('copy_integration', {
          policyId: agentPolicy?.id || '',
          packagePolicyId: packagePolicy.id,
        })
  }${copyQueryString ? `?${copyQueryString}` : ''}`;

  const menuItems = [
    // FIXME: implement View package policy action
    // <EuiContextMenuItem
    //   disabled
    //   icon="inspect"
    //   onClick={() => {}}
    //   key="packagePolicyView"
    // >
    //   <FormattedMessage
    //     id="xpack.fleet.policyDetails.packagePoliciesTable.viewActionTitle"
    //     defaultMessage="View integration"
    //   />
    // </EuiContextMenuItem>,
    ...(isAddAgentVisible
      ? [
          <EuiContextMenuItem
            data-test-subj="PackagePolicyActionsAddAgentItem"
            icon="plusCircle"
            onClick={() => {
              setIsActionsMenuOpen(false);
              setIsEnrollmentFlyoutOpen(true);
            }}
            key="addAgent"
            disabled={!canAddAgents}
          >
            <FormattedMessage
              id="xpack.fleet.epm.packageDetails.integrationList.addAgent"
              defaultMessage="Add agent"
            />
          </EuiContextMenuItem>,
        ]
      : []),
    <EuiContextMenuItem
      data-test-subj="PackagePolicyActionsEditItem"
      disabled={!canWriteIntegrationPolicies || (!agentPolicy && !isOrphanedPolicy)}
      icon="pencil"
      href={editHref}
      key="packagePolicyEdit"
    >
      <FormattedMessage
        id="xpack.fleet.policyDetails.packagePoliciesTable.editActionTitle"
        defaultMessage="Edit integration"
      />
    </EuiContextMenuItem>,
    ...(packagePolicy.hasUpgrade &&
    packagePolicy.keepPoliciesUpToDate &&
    packagePolicy.pendingUpgradeReview &&
    packagePolicy.pendingUpgradeReview.action !== 'accepted'
      ? [
          <EuiContextMenuItem
            data-test-subj="PackagePolicyActionsDeclinedUpgradeItem"
            disabled={!canWriteIntegrationPolicies}
            icon="refresh"
            onClick={() => {
              setIsActionsMenuOpen(false);
              scheduleAutoOpenModal(packagePolicy.package?.name || '');
              handleReviewUpgrade();
            }}
            key="packagePolicyDeclinedUpgrade"
          >
            <FormattedMessage
              id="xpack.fleet.policyDetails.packagePoliciesTable.declinedUpgradeActionTitle"
              data-test-subj="DeclinedUpgradeIntegrationPolicy"
              defaultMessage="Review policy upgrade"
            />
          </EuiContextMenuItem>,
        ]
      : packagePolicy.hasUpgrade
      ? [
          <EuiContextMenuItem
            data-test-subj="PackagePolicyActionsUpgradeItem"
            disabled={
              !canWriteIntegrationPolicies || (!isAgentlessUpgrade && !upgradePackagePolicyHref)
            }
            icon="refresh"
            {...(isAgentlessUpgrade
              ? {
                  onClick: () => {
                    setIsActionsMenuOpen(false);
                    openAgentlessUpgradeModal();
                  },
                }
              : { href: upgradePackagePolicyHref })}
            key="packagePolicyUpgrade"
          >
            <FormattedMessage
              id="xpack.fleet.policyDetails.packagePoliciesTable.upgradeActionTitle"
              data-test-subj="UpgradeIntegrationPolicy"
              defaultMessage="Upgrade integration policy"
            />
          </EuiContextMenuItem>,
        ]
      : []),
    <EuiContextMenuItem
      disabled={
        !canWriteIntegrationPolicies ||
        EXCLUDED_FROM_PACKAGE_POLICY_COPY_PACKAGES.includes(packagePolicy.package?.name || '')
      }
      toolTipContent={
        EXCLUDED_FROM_PACKAGE_POLICY_COPY_PACKAGES.includes(packagePolicy.package?.name || '') ? (
          <FormattedMessage
            id="xpack.fleet.policyDetails.packagePoliciesTable.copyActionDisabledTooltip"
            defaultMessage="Copying a {packageName} integration policy is not supported."
            values={{ packageName: packagePolicy.package?.name || '' }}
          />
        ) : undefined
      }
      href={copyHref}
      data-test-subj="PackagePolicyActionsCopyItem"
      icon="copy"
      key="packagePolicyCopy"
    >
      <FormattedMessage
        id="xpack.fleet.policyDetails.packagePoliciesTable.copyActionTitle"
        defaultMessage="Copy integration"
      />
    </EuiContextMenuItem>,
    ...(isConnectorPolicy
      ? [
          <EuiContextMenuItem
            data-test-subj="PackagePolicyActionsManageConnectorItem"
            icon="gear"
            onClick={() => {
              setIsActionsMenuOpen(false);
              application.navigateToApp(MANAGEMENT_APP_ID, {
                path: connectorId ? `${CONNECTORS_PATH}/${connectorId}` : CONNECTORS_PATH,
              });
            }}
            key="packagePolicyManageConnector"
          >
            <FormattedMessage
              id="xpack.fleet.policyDetails.packagePoliciesTable.manageConnectorActionTitle"
              defaultMessage="Manage connector"
            />
          </EuiContextMenuItem>,
        ]
      : []),
  ];

  if (isAgentlessPolicy) {
    menuItems.push(
      <EuiCopy textToCopy={supportBundleText} key="packagePolicyCopySupportInfo">
        {(copy) => (
          <EuiContextMenuItem
            data-test-subj="PackagePolicyActionsCopySupportInfoItem"
            icon="copy"
            onClick={() => {
              copy();
              setIsActionsMenuOpen(false);
            }}
          >
            <FormattedMessage
              id="xpack.fleet.policyDetails.packagePoliciesTable.copySupportInfoActionTitle"
              defaultMessage="Copy support info"
            />
          </EuiContextMenuItem>
        )}
      </EuiCopy>
    );
  }

  if (!agentPolicy || !agentPolicyIsManaged || agentPolicy?.supports_agentless) {
    const ContextMenuItem = canWriteIntegrationPolicies
      ? DangerEuiContextMenuItem
      : EuiContextMenuItem;
    menuItems.push(
      <PackagePolicyDeleteProvider
        from={from}
        agentPolicies={agentPolicies}
        key="packagePolicyDelete"
        packagePolicyPackage={packagePolicy.package}
        isAgentlessPolicy={packagePolicy.supports_agentless}
      >
        {(deletePackagePoliciesPrompt) => {
          return (
            <ContextMenuItem
              data-test-subj="PackagePolicyActionsDeleteItem"
              disabled={!canWriteIntegrationPolicies}
              icon="trash"
              onClick={() => {
                deletePackagePoliciesPrompt([packagePolicy.id], () => {
                  setIsActionsMenuOpen(false);
                  refreshAgentPolicy();
                });
              }}
            >
              <FormattedMessage
                id="xpack.fleet.policyDetails.packagePoliciesTable.deleteActionTitle"
                defaultMessage="Delete integration"
              />
            </ContextMenuItem>
          );
        }}
      </PackagePolicyDeleteProvider>
    );
  }
  return (
    <>
      {agentlessUpgradeModal}
      {isEnrollmentFlyoutOpen && (
        <EuiPortal>
          <AgentEnrollmentFlyout
            agentPolicy={agentPolicies.length === 1 ? agentPolicies[0] : undefined} // in case of multiple policies, show the selector in the flyout
            selectedAgentPolicies={agentPolicies}
            onClose={onEnrollmentFlyoutClose}
            isIntegrationFlow={true}
            installedPackagePolicy={{
              name: packagePolicy?.package?.name || '',
              version: packagePolicy?.package?.version || '',
            }}
          />
        </EuiPortal>
      )}
      <ContextMenuActions
        isManaged={isManaged}
        isOpen={isActionsMenuOpen}
        items={menuItems}
        onChange={(open) => setIsActionsMenuOpen(open)}
        aria-label={i18n.translate('xpack.fleet.packagePolicyActionsMenu.actionsAriaLabel', {
          defaultMessage: 'Actions for {policyName}',
          values: { policyName: packagePolicy.name },
        })}
      />
    </>
  );
};
