/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useRouteMatch } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButtonEmpty,
  EuiBottomBar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiErrorBoundary,
} from '@elastic/eui';

import { useSetIsReadOnly } from '../../../../integrations/hooks/use_read_only_context';
import {
  useLink,
  useBreadcrumbs,
  useStartServices,
  useConfig,
  useUIExtension,
  useAuthz,
  sendBulkGetAgentPoliciesForRq,
} from '../../../hooks';
import {
  useBreadcrumbs as useIntegrationsBreadcrumbs,
  useGetOnePackagePolicy,
} from '../../../../integrations/hooks';
import {
  Loading,
  Error as ErrorComponent,
  ExtensionWrapper,
  EuiButtonWithTooltip,
  DevtoolsRequestFlyoutButton,
} from '../../../components';
import { ConfirmDeployAgentPolicyModal } from '../components';
import { CreatePackagePolicySinglePageLayout } from '../create_package_policy_page/single_page_layout/components';
import type { EditPackagePolicyFrom } from '../create_package_policy_page/types';
import {
  StepConfigurePackagePolicy,
  StepDefinePackagePolicy,
} from '../create_package_policy_page/components';
import type { AgentPolicy, PackagePolicyEditExtensionComponentProps } from '../../../types';
import { pkgKeyFromPackageInfo } from '../../../services';

import {
  getInheritedNamespace,
  getRootPrivilegedDataStreams,
  isRootPrivilegesRequired,
} from '../../../../../../common/services';
import { useMultipleAgentPolicies } from '../../../hooks';

import { RootPrivilegesCallout } from '../create_package_policy_page/single_page_layout/root_callout';

import { StepsWithLessPadding } from '../create_package_policy_page/single_page_layout';

import { useAgentless } from '../create_package_policy_page/single_page_layout/hooks/setup_technology';

import { UpgradeStatusCallout } from './components';
import { usePackagePolicyWithRelatedData, useHistoryBlock } from './hooks';
import { getNewSecrets } from './utils';
import { usePackagePolicySteps } from './hooks';

export const EditPackagePolicyPage = memo(() => {
  const {
    params: { packagePolicyId, policyId },
  } = useRouteMatch<{ policyId: string; packagePolicyId: string }>();

  const packagePolicy = useGetOnePackagePolicy(packagePolicyId);
  const extensionView = useUIExtension(
    packagePolicy.data?.item?.package?.name ?? '',
    'package-policy-edit'
  );

  return (
    <EditPackagePolicyForm
      packagePolicyId={packagePolicyId}
      policyId={policyId}
      // If an extension opts in to this `useLatestPackageVersion` flag, we want to display
      // the edit form in an "upgrade" state regardless of whether the user intended to
      // "edit" their policy or "upgrade" it. This ensures the new policy generated will be
      // set to use the latest version of the package, not its current version.
      forceUpgrade={extensionView?.useLatestPackageVersion}
    />
  );
});

export const EditPackagePolicyForm = memo<{
  packagePolicyId: string;
  forceUpgrade?: boolean;
  from?: EditPackagePolicyFrom;
  policyId?: string;
}>(({ packagePolicyId, policyId, forceUpgrade = false, from = 'edit' }) => {
  const { application, notifications } = useStartServices();
  const {
    agents: { enabled: isFleetEnabled },
  } = useConfig();
  const { getHref } = useLink();
  const { canUseMultipleAgentPolicies } = useMultipleAgentPolicies();
  const { isAgentlessAgentPolicy, isAgentlessIntegration } = useAgentless();
  const {
    // data
    agentPolicies: existingAgentPolicies,
    isLoadingData,
    loadingError,
    packagePolicy,
    originalPackagePolicy,
    packageInfo,
    upgradeDryRunData,
    // form
    formState,
    setFormState,
    isUpgrade,
    isEdited,
    setIsEdited,
    savePackagePolicy,
    hasErrors,
    updatePackagePolicy,
    validationResults,
  } = usePackagePolicyWithRelatedData(packagePolicyId, {
    forceUpgrade,
  });

  const hasAgentlessAgentPolicy = useMemo(
    () =>
      existingAgentPolicies.length === 1
        ? existingAgentPolicies.some((policy) => isAgentlessAgentPolicy(policy)) &&
          isAgentlessIntegration(packageInfo)
        : false,
    [existingAgentPolicies, isAgentlessAgentPolicy, packageInfo, isAgentlessIntegration]
  );

  const canWriteIntegrationPolicies = useAuthz().integrations.writeIntegrationPolicies;
  useSetIsReadOnly(!canWriteIntegrationPolicies);
  const newSecrets = useMemo(() => {
    if (!packageInfo) {
      return [];
    }

    return getNewSecrets({ packageInfo, packagePolicy });
  }, [packageInfo, packagePolicy]);

  const [agentPolicies, setAgentPolicies] = useState<AgentPolicy[]>([]);
  const [isFirstLoad, setIsFirstLoad] = useState<boolean>(true);
  const [newAgentPolicyName, setNewAgentPolicyName] = useState<string | undefined>();

  // make form dirty if new agent policy is selected
  useEffect(() => {
    if (newAgentPolicyName) {
      setIsEdited(true);
    }
  }, [newAgentPolicyName, setIsEdited]);

  const [hasAgentPolicyError, setHasAgentPolicyError] = useState<boolean>(false);

  const agentPoliciesToAdd = useMemo(
    () => [
      ...agentPolicies
        .filter(
          (policy) =>
            !existingAgentPolicies.find((existingPolicy) => existingPolicy.id === policy.id)
        )
        .map((policy) => policy.name),
      ...(newAgentPolicyName ? [newAgentPolicyName] : []),
    ],
    [agentPolicies, existingAgentPolicies, newAgentPolicyName]
  );
  const agentPoliciesToRemove = useMemo(
    () =>
      existingAgentPolicies.filter(
        (existingPolicy) => !agentPolicies.find((policy) => policy.id === existingPolicy.id)
      ),
    [agentPolicies, existingAgentPolicies]
  );

  const agentPoliciesToRemoveIds = useMemo(
    () => agentPoliciesToRemove.map((policy) => policy.id),
    [agentPoliciesToRemove]
  );

  const agentPoliciesToRemoveName = useMemo(
    () => agentPoliciesToRemove.map((policy) => policy.name),
    [agentPoliciesToRemove]
  );

  // Retrieve agent count
  const [agentCount, setAgentCount] = useState<number>(0);
  const [impactedAgentCount, setImpactedAgentCount] = useState<number>(0);
  useEffect(() => {
    const getAgentCount = async () => {
      const policiesToFetchIds = [...packagePolicy.policy_ids, ...agentPoliciesToRemoveIds];
      try {
        const bulkGetAgentPoliciesResponse = await sendBulkGetAgentPoliciesForRq(
          policiesToFetchIds,
          {
            ignoreMissing: true,
          }
        );

        let count = 0;
        let impactedCount = 0;
        for (const item of bulkGetAgentPoliciesResponse.items) {
          if (packagePolicy.policy_ids.includes(item.id)) {
            count += item.agents ?? 0;
          }

          impactedCount += item.agents ?? 0;
        }
        setAgentCount(count);
        setImpactedAgentCount(impactedCount);
      } catch (err) {
        setAgentCount(0);
        setImpactedAgentCount(0);
      }
    };

    if (
      isFleetEnabled &&
      (packagePolicy.policy_ids.length > 0 || agentPoliciesToRemoveIds.length > 0)
    ) {
      getAgentCount();
    }
  }, [packagePolicy.policy_ids, agentPoliciesToRemoveIds, isFleetEnabled]);

  const handleExtensionViewOnChange = useCallback<
    PackagePolicyEditExtensionComponentProps['onChange']
  >(
    ({ isValid, updatedPolicy }) => {
      updatePackagePolicy(updatedPolicy);
      setFormState((prevState) => {
        if (prevState === 'VALID' && !isValid) {
          return 'INVALID';
        }
        return prevState;
      });
    },
    [updatePackagePolicy, setFormState]
  );

  // Cancel url + Success redirect Path:
  //  if `from === 'edit'` then it links back to Policy Details
  //  if `from === 'package-edit'`, or `upgrade-from-integrations-policy-list` then it links back to the Integration Policy List
  const cancelUrl = useMemo((): string => {
    return from === 'package-edit' && packageInfo
      ? getHref('integration_details_policies', {
          pkgkey: pkgKeyFromPackageInfo(packageInfo!),
        })
      : policyId
      ? getHref('policy_details', { policyId })
      : getHref('agent_list');
  }, [from, getHref, packageInfo, policyId]);
  const successRedirectPath = useMemo(() => {
    return (from === 'package-edit' || from === 'upgrade-from-integrations-policy-list') &&
      packageInfo
      ? getHref('integration_details_policies', {
          pkgkey: pkgKeyFromPackageInfo(packageInfo!),
        })
      : policyId
      ? getHref('policy_details', { policyId })
      : getHref('agent_list');
  }, [from, getHref, packageInfo, policyId]);

  useHistoryBlock(isEdited);

  useEffect(() => {
    if (existingAgentPolicies.length > 0 && isFirstLoad) {
      setIsFirstLoad(false);
      setAgentPolicies(existingAgentPolicies);
    }
  }, [existingAgentPolicies, isFirstLoad]);

  const onSubmit = async () => {
    if (formState === 'VALID' && hasErrors) {
      setFormState('INVALID');
      return;
    }
    if (
      (agentCount !== 0 ||
        agentPolicies.length === 0 ||
        agentPoliciesToAdd.length > 0 ||
        agentPoliciesToRemove.length > 0) &&
      !hasAgentlessAgentPolicy &&
      formState !== 'CONFIRM'
    ) {
      setFormState('CONFIRM');
      return;
    }

    let newPolicyId;
    try {
      setFormState('LOADING');
      newPolicyId = await createAgentPolicyIfNeeded();
    } catch (e) {
      setFormState('VALID');
      notifications.toasts.addError(e, {
        title: i18n.translate('xpack.fleet.createAgentPolicy.errorNotificationTitle', {
          defaultMessage: 'Unable to create agent policy',
        }),
      });
      return;
    }

    const { error } = await savePackagePolicy({
      policy_ids: newPolicyId
        ? [...packagePolicy.policy_ids, newPolicyId]
        : packagePolicy.policy_ids,
    });
    if (!error) {
      setIsEdited(false);
      application.navigateToUrl(successRedirectPath);
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.fleet.editPackagePolicy.updatedNotificationTitle', {
          defaultMessage: `Successfully updated ''{packagePolicyName}''`,
          values: {
            packagePolicyName: packagePolicy.name,
          },
        }),
        'data-test-subj': 'policyUpdateSuccessToast',
        text:
          agentCount && agentPolicies.length > 0
            ? i18n.translate('xpack.fleet.editPackagePolicy.updatedNotificationMessage', {
                defaultMessage: `Fleet will deploy updates to all agents that use the ''{agentPolicyNames}'' policy`,
                values: {
                  agentPolicyNames: agentPolicies.map((policy) => policy.name).join(', '),
                },
              })
            : undefined,
      });
    } else {
      if (error.statusCode === 409) {
        notifications.toasts.addError(error, {
          title: i18n.translate('xpack.fleet.editPackagePolicy.failedNotificationTitle', {
            defaultMessage: `Error updating ''{packagePolicyName}''`,
            values: {
              packagePolicyName: packagePolicy.name,
            },
          }),
          toastMessage: i18n.translate(
            'xpack.fleet.editPackagePolicy.failedConflictNotificationMessage',
            {
              defaultMessage: `Data is out of date. Refresh the page to get the latest policy.`,
            }
          ),
        });
      } else {
        notifications.toasts.addError(error, {
          title: i18n.translate('xpack.fleet.editPackagePolicy.failedNotificationTitle', {
            defaultMessage: `Error updating ''{packagePolicyName}''`,
            values: {
              packagePolicyName: packagePolicy.name,
            },
          }),
        });
      }
      setFormState('VALID');
    }
  };

  const extensionView = useUIExtension(packagePolicy.package?.name ?? '', 'package-policy-edit');
  const replaceDefineStepView = useUIExtension(
    packagePolicy.package?.name ?? '',
    'package-policy-replace-define-step'
  );
  const extensionTabsView = useUIExtension(
    packagePolicy.package?.name ?? '',
    'package-policy-edit-tabs'
  );

  if (replaceDefineStepView && extensionView) {
    throw new Error(
      "'package-policy-create' and 'package-policy-replace-define-step' cannot both be registered as UI extensions"
    );
  }

  const tabsViews = extensionTabsView?.tabs;
  const [selectedTab, setSelectedTab] = useState(0);

  const layoutProps = {
    from: extensionView?.useLatestPackageVersion && isUpgrade ? 'upgrade-from-extension' : from,
    cancelUrl,
    agentPolicies,
    packageInfo,
    tabs: tabsViews?.length
      ? [
          {
            title: i18n.translate('xpack.fleet.editPackagePolicy.settingsTabName', {
              defaultMessage: 'Settings',
            }),
            isSelected: selectedTab === 0,
            onClick: () => {
              setSelectedTab(0);
            },
          },
          ...tabsViews.map(({ title }, index) => ({
            title,
            isSelected: selectedTab === index + 1,
            onClick: () => {
              setSelectedTab(index + 1);
            },
          })),
        ]
      : [],
  };

  const configurePackage = useMemo(
    () =>
      agentPolicies && packageInfo ? (
        <>
          {selectedTab === 0 && (
            <StepDefinePackagePolicy
              namespacePlaceholder={getInheritedNamespace(agentPolicies)}
              packageInfo={packageInfo}
              packagePolicy={packagePolicy}
              updatePackagePolicy={updatePackagePolicy}
              validationResults={validationResults}
              submitAttempted={formState === 'INVALID'}
              isEditPage={true}
            />
          )}

          {/* Only show the out-of-box configuration step if a UI extension is NOT registered */}
          {!extensionView && selectedTab === 0 && (
            <StepConfigurePackagePolicy
              packageInfo={packageInfo}
              packagePolicy={packagePolicy}
              updatePackagePolicy={updatePackagePolicy}
              validationResults={validationResults}
              submitAttempted={formState === 'INVALID'}
              isEditPage={true}
            />
          )}

          {extensionView &&
            packagePolicy.policy_ids[0] &&
            packagePolicy.package?.name &&
            originalPackagePolicy && (
              <ExtensionWrapper>
                {selectedTab > 0 && tabsViews ? (
                  React.createElement(tabsViews[selectedTab - 1].Component, {
                    policy: originalPackagePolicy,
                    newPolicy: packagePolicy,
                    onChange: handleExtensionViewOnChange,
                  })
                ) : (
                  <extensionView.Component
                    policy={originalPackagePolicy}
                    newPolicy={packagePolicy}
                    onChange={handleExtensionViewOnChange}
                  />
                )}
              </ExtensionWrapper>
            )}
        </>
      ) : null,
    [
      agentPolicies,
      packageInfo,
      packagePolicy,
      updatePackagePolicy,
      validationResults,
      formState,
      originalPackagePolicy,
      extensionView,
      handleExtensionViewOnChange,
      selectedTab,
      tabsViews,
    ]
  );

  const replaceConfigurePackage = replaceDefineStepView && originalPackagePolicy && packageInfo && (
    <ExtensionWrapper>
      <replaceDefineStepView.Component
        agentPolicies={agentPolicies}
        packageInfo={packageInfo}
        policy={originalPackagePolicy}
        newPolicy={packagePolicy}
        onChange={handleExtensionViewOnChange}
        validationResults={validationResults}
        isEditPage={true}
        isAgentlessEnabled={hasAgentlessAgentPolicy}
      />
    </ExtensionWrapper>
  );

  const rootPrivilegedDataStreams = packageInfo ? getRootPrivilegedDataStreams(packageInfo) : [];

  const agentPolicyBreadcrumb = useMemo(() => {
    return existingAgentPolicies.length > 0
      ? existingAgentPolicies.find((policy) => policy.id === policyId) ?? existingAgentPolicies[0]
      : { name: '', id: '' };
  }, [existingAgentPolicies, policyId]);

  const {
    steps,
    devToolsProps: { devtoolRequest, devtoolRequestDescription, showDevtoolsRequest },
    createAgentPolicyIfNeeded,
  } = usePackagePolicySteps({
    configureStep: replaceConfigurePackage || configurePackage,
    packageInfo,
    existingAgentPolicies,
    setHasAgentPolicyError,
    updatePackagePolicy,
    agentPolicies,
    setAgentPolicies,
    isLoadingData,
    packagePolicy,
    packagePolicyId,
    setNewAgentPolicyName,
  });

  return (
    <CreatePackagePolicySinglePageLayout {...layoutProps} data-test-subj="editPackagePolicy">
      <EuiErrorBoundary>
        {isLoadingData ? (
          <Loading />
        ) : loadingError || !packageInfo ? (
          <ErrorComponent
            title={
              <FormattedMessage
                id="xpack.fleet.editPackagePolicy.errorLoadingDataTitle"
                defaultMessage="Error loading data"
              />
            }
            error={
              loadingError ||
              i18n.translate('xpack.fleet.editPackagePolicy.errorLoadingDataMessage', {
                defaultMessage: 'There was an error loading this integration information',
              })
            }
          />
        ) : (
          <>
            <Breadcrumb
              agentPolicyName={agentPolicyBreadcrumb.name}
              from={from}
              packagePolicyName={packagePolicy.name}
              pkgkey={pkgKeyFromPackageInfo(packageInfo)}
              pkgTitle={packageInfo.title}
              policyId={agentPolicyBreadcrumb.id}
            />
            {formState === 'CONFIRM' && (
              <ConfirmDeployAgentPolicyModal
                agentCount={impactedAgentCount}
                agentPolicies={agentPolicies}
                onConfirm={onSubmit}
                onCancel={() => setFormState('VALID')}
                agentPoliciesToAdd={agentPoliciesToAdd}
                agentPoliciesToRemove={agentPoliciesToRemoveName}
              />
            )}
            {packageInfo && isRootPrivilegesRequired(packageInfo) ? (
              <>
                <RootPrivilegesCallout dataStreams={rootPrivilegedDataStreams} />
                <EuiSpacer size="m" />
              </>
            ) : null}
            {isUpgrade && upgradeDryRunData && (
              <>
                <UpgradeStatusCallout dryRunData={upgradeDryRunData} newSecrets={newSecrets} />
                <EuiSpacer size="xxl" />
              </>
            )}
            {canUseMultipleAgentPolicies && !hasAgentlessAgentPolicy ? (
              <StepsWithLessPadding steps={steps} />
            ) : (
              replaceConfigurePackage || configurePackage
            )}
            {/* Extra space to accomodate the EuiBottomBar height */}
            <EuiSpacer size="xxl" />
            <EuiSpacer size="xxl" />
            <EuiBottomBar>
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                <EuiFlexItem grow={false}>
                  {agentPolicies &&
                  packageInfo &&
                  (formState === 'INVALID' || hasAgentPolicyError) ? (
                    <FormattedMessage
                      id="xpack.fleet.createPackagePolicy.errorOnSaveText"
                      defaultMessage="Your integration policy has errors. Please fix them before saving."
                    />
                  ) : null}
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty color="text" href={cancelUrl}>
                        <FormattedMessage
                          id="xpack.fleet.editPackagePolicy.cancelButton"
                          defaultMessage="Cancel"
                        />
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                    {showDevtoolsRequest ? (
                      <EuiFlexItem grow={false}>
                        <DevtoolsRequestFlyoutButton
                          isDisabled={formState !== 'VALID'}
                          btnProps={{
                            color: 'text',
                          }}
                          request={devtoolRequest}
                          description={devtoolRequestDescription}
                        />
                      </EuiFlexItem>
                    ) : null}
                    <EuiFlexItem grow={false}>
                      <EuiButtonWithTooltip
                        onClick={onSubmit}
                        isLoading={formState === 'LOADING'}
                        // Allow to save only if the package policy is upgraded or had been edited
                        isDisabled={
                          !canWriteIntegrationPolicies ||
                          formState !== 'VALID' ||
                          hasAgentPolicyError ||
                          !validationResults ||
                          (!isEdited && !isUpgrade)
                        }
                        tooltip={
                          !canWriteIntegrationPolicies
                            ? {
                                content: (
                                  <FormattedMessage
                                    id="xpack.fleet.agentPolicy.saveIntegrationTooltip"
                                    defaultMessage="To save the integration policy, you must have security enabled and have the All privilege for Integrations and Agent Policies. Contact your administrator."
                                  />
                                ),
                              }
                            : undefined
                        }
                        iconType="save"
                        color="primary"
                        fill
                        data-test-subj="saveIntegration"
                      >
                        {isUpgrade ? (
                          <FormattedMessage
                            id="xpack.fleet.editPackagePolicy.upgradeButton"
                            defaultMessage="Upgrade integration"
                          />
                        ) : (
                          <FormattedMessage
                            id="xpack.fleet.editPackagePolicy.saveButton"
                            defaultMessage="Save integration"
                          />
                        )}
                      </EuiButtonWithTooltip>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiBottomBar>
          </>
        )}
      </EuiErrorBoundary>
    </CreatePackagePolicySinglePageLayout>
  );
});

const Breadcrumb = memo<{
  agentPolicyName: string;
  from: EditPackagePolicyFrom;
  packagePolicyName: string;
  pkgkey: string;
  pkgTitle: string;
  policyId: string;
}>(({ agentPolicyName, from, packagePolicyName, pkgkey, pkgTitle, policyId }) => {
  let breadcrumb = <PoliciesBreadcrumb policyName={agentPolicyName} policyId={policyId} />;

  if (from === 'package' || from === 'package-edit') {
    breadcrumb = (
      <IntegrationsBreadcrumb pkgkey={pkgkey} pkgTitle={pkgTitle} policyName={packagePolicyName} />
    );
  } else if (from === 'upgrade-from-integrations-policy-list') {
    breadcrumb = (
      <IntegrationsUpgradeBreadcrumb
        pkgkey={pkgkey}
        pkgTitle={pkgTitle}
        policyName={packagePolicyName}
      />
    );
  } else if (from === 'upgrade-from-fleet-policy-list') {
    breadcrumb = <UpgradeBreadcrumb policyName={agentPolicyName} policyId={policyId} />;
  }

  return breadcrumb;
});

const IntegrationsBreadcrumb = memo<{
  pkgTitle: string;
  policyName: string;
  pkgkey: string;
}>(({ pkgTitle, policyName, pkgkey }) => {
  useIntegrationsBreadcrumbs('integration_policy_edit', { policyName, pkgTitle, pkgkey });
  return null;
});

const PoliciesBreadcrumb: React.FunctionComponent<{
  policyName: string;
  policyId: string;
}> = ({ policyName, policyId }) => {
  useBreadcrumbs('edit_integration', { policyName, policyId });
  return null;
};

const IntegrationsUpgradeBreadcrumb = memo<{
  pkgTitle: string;
  policyName: string;
  pkgkey: string;
}>(({ pkgTitle, policyName, pkgkey }) => {
  useIntegrationsBreadcrumbs('integration_policy_upgrade', { policyName, pkgTitle, pkgkey });
  return null;
});

const UpgradeBreadcrumb: React.FunctionComponent<{
  policyName: string;
  policyId: string;
}> = ({ policyName, policyId }) => {
  useBreadcrumbs('upgrade_package_policy', { policyName, policyId });
  return null;
};
