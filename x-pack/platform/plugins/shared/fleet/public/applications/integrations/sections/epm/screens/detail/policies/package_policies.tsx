/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Redirect, useLocation } from 'react-router-dom';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiNotificationBadge,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import { InstallStatus } from '../../../../../types';
import type {
  AgentPolicy,
  GetAgentPoliciesResponseItem,
  InMemoryPackagePolicy,
  PackageInfo,
  PackagePolicy,
  PackagePolicyPackage,
} from '../../../../../types';
import {
  useLink,
  useGetPackageInstallStatus,
  AgentPolicyRefreshContext,
  useIsPackagePolicyUpgradable,
  usePagination,
  useGetPackageInfoByKeyQuery,
} from '../../../../../hooks';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../../../constants';
import { isAgentlessPoliciesUIEnabled } from '../../../../../services';
import { SideBarColumn } from '../../../components/side_bar_column';

import { useAgentless } from '../../../../../../fleet/sections/agent_policy/create_package_policy_page/single_page_layout/hooks/setup_technology';

import { usePackagePoliciesWithAgentPolicy } from './use_package_policies_with_agent_policy';
import { useAgentlessPolicies } from './use_agentless_policies';
import { agentlessPolicyToTableItem } from './agentless_policy_table_adapter';
import { AgentBasedPackagePoliciesTable } from './components/agent_based_table';
import { AgentlessPackagePoliciesTable } from './components/agentless_table';

export const PackagePoliciesPage = ({
  packageInfo,
  embedded,
}: {
  packageInfo: PackageInfo;
  embedded?: boolean;
}) => {
  const { name, version, type } = packageInfo;

  const { search } = useLocation();
  const queryParams = useMemo(() => new URLSearchParams(search), [search]);
  const addAgentToPolicyIdFromParams = useMemo(
    () => queryParams.get('addAgentToPolicyId'),
    [queryParams]
  );
  const showAddAgentHelpForPolicyId = useMemo(
    () => queryParams.get('showAddAgentHelpForPolicyId'),
    [queryParams]
  );
  const { getPath } = useLink();
  const getPackageInstallStatus = useGetPackageInstallStatus();
  const packageInstallStatus = getPackageInstallStatus(name);

  const {
    isPackagePolicyUpgradable,
    getPackagePolicyUpgradeReview,
    getKeepPoliciesUpToDate,
    getUpgradeVersion,
  } = useIsPackagePolicyUpgradable();
  const { getAgentlessStatusForPackage } = useAgentless();
  const canHaveAgentlessPolicies = useMemo(
    () => getAgentlessStatusForPackage(packageInfo).isAgentless,
    [getAgentlessStatusForPackage, packageInfo]
  );
  // Kill switch: when off, the agentless deployments table is sourced from the legacy
  // package-policy LIST + bulk agent-policy reads instead of the managed integrations API.
  const agentlessUIEnabled = isAgentlessPoliciesUIEnabled();

  // The agentless deployments table re-derives each policy's inputs from the package manifest
  // (agentless policies come from the LIST API with simplified object inputs). That requires the
  // FULL package info: the detail page's `packageInfo` is fetched without `full: true`, so its
  // policy templates carry no `inputs` and the expansion would throw `Input not found`. Fetch the
  // full manifest only when agentless policies are possible.
  const {
    data: agentlessFullPackageInfoData,
    isLoading: isAgentlessFullPackageInfoLoading,
    error: agentlessFullPackageInfoError,
    refetch: refetchAgentlessFullPackageInfo,
  } = useGetPackageInfoByKeyQuery(
    name,
    version,
    // `prerelease` is inert on a specific-version GET: the requested version is returned either
    // way, and the flag only shapes the `latestVersion` metadata, which this path never reads
    // (only the manifest's policy templates/inputs, for expansion). Hardcoded so the fetch does
    // not have to wait on a settings read like the edit/copy paths, whose loaders resolve it
    // from settings as part of a sequential load.
    { full: true, prerelease: true },
    // Only the agentless-API adapter path needs the full manifest; the legacy source
    // returns full package policies that need no re-expansion.
    { enabled: canHaveAgentlessPolicies && agentlessUIEnabled }
  );
  const agentlessFullPackageInfo = agentlessFullPackageInfoData?.item;

  // Helper function to map raw policies data for consumption by the table
  const mapPoliciesData = useCallback(
    (
      {
        agentPolicies,
        packagePolicy,
      }: { agentPolicies: AgentPolicy[]; packagePolicy: PackagePolicy },
      index: number
    ): { agentPolicies: AgentPolicy[]; packagePolicy: InMemoryPackagePolicy; rowIndex: number } => {
      return {
        agentPolicies,
        packagePolicy: {
          ...packagePolicy,
          package: {
            ...(packagePolicy?.package as PackagePolicyPackage),
            type,
          },
          hasUpgrade: isPackagePolicyUpgradable(packagePolicy),
          upgradeVersion: getUpgradeVersion(packagePolicy),
          pendingUpgradeReview: getPackagePolicyUpgradeReview(packagePolicy),
          keepPoliciesUpToDate: getKeepPoliciesUpToDate(packagePolicy),
        },
        rowIndex: index,
      };
    },
    [
      isPackagePolicyUpgradable,
      getUpgradeVersion,
      getPackagePolicyUpgradeReview,
      getKeepPoliciesUpToDate,
      type,
    ]
  );

  // States and data for agent-based policies table
  // If agentless is not supported or not an agentless integration, skip the
  // conditional in the kuery
  const {
    pagination: agentBasedPagination,
    pageSizeOptions: agentBasedPageSizeOptions,
    setPagination: agentBasedSetPagination,
  } = usePagination();
  const [agentBasedPackageAndAgentPolicies, setAgentBasedPackageAndAgentPolicies] = useState<
    Array<{
      agentPolicies: GetAgentPoliciesResponseItem[];
      packagePolicy: InMemoryPackagePolicy;
      rowIndex: number;
    }>
  >([]);
  const {
    data: agentBasedData,
    isLoading: agentBasedIsLoading,
    resendRequest: refreshAgentBasedPolicies,
  } = usePackagePoliciesWithAgentPolicy({
    page: agentBasedPagination.currentPage,
    perPage: agentBasedPagination.pageSize,
    kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: "${name}" ${
      canHaveAgentlessPolicies
        ? `AND NOT ${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.supports_agentless: true`
        : ``
    }`,
  });
  useEffect(() => {
    const mappedPoliciesData = !agentBasedData?.items
      ? []
      : agentBasedData.items.map(mapPoliciesData);
    setAgentBasedPackageAndAgentPolicies(mappedPoliciesData);
  }, [agentBasedData, mapPoliciesData]);

  // States and data for agentless policies table
  // If agentless is not supported or not an agentless integration, this block and
  // initial request is unnessary but reduces code complexity
  const {
    pagination: agentlessPagination,
    pageSizeOptions: agentlessPageSizeOptions,
    setPagination: agentlessSetPagination,
  } = usePagination();
  const [agentlessPackageAndAgentPolicies, setAgentlessPackageAndAgentPolicies] = useState<
    Array<{
      agentPolicies: GetAgentPoliciesResponseItem[];
      packagePolicy: InMemoryPackagePolicy;
      rowIndex: number;
    }>
  >([]);
  // Agentless deployments are read through the agentless policies LIST API (not the
  // package-policy LIST + bulk agent-policy reads). The server scopes the result set to
  // agentless, so we only filter by package name; each AgentlessPolicy is mapped to the
  // table's `{ packagePolicy, agentPolicies }` row shape before the shared enrichment.
  const {
    data: agentlessData,
    isLoading: agentlessIsLoading,
    error: agentlessError,
    resendRequest: refreshAgentlessPolicies,
  } = useAgentlessPolicies(
    {
      page: agentlessPagination.currentPage,
      perPage: agentlessPagination.pageSize,
      kuery: `package.name: "${name}"`,
    },
    { enabled: canHaveAgentlessPolicies && agentlessUIEnabled }
  );
  // Legacy source for the agentless table, active only when the agentless policies UI kill
  // switch is off: the pre-migration package-policy LIST (scoped to `supports_agentless`) plus
  // the bulk agent-policy enrichment.
  const {
    data: legacyAgentlessData,
    isLoading: legacyAgentlessIsLoading,
    error: legacyAgentlessError,
    resendRequest: refreshLegacyAgentlessPolicies,
  } = usePackagePoliciesWithAgentPolicy(
    {
      page: agentlessPagination.currentPage,
      perPage: agentlessPagination.pageSize,
      kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: "${name}" AND ${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.supports_agentless: true`,
    },
    { enabled: canHaveAgentlessPolicies && !agentlessUIEnabled }
  );
  useEffect(() => {
    if (!agentlessUIEnabled) {
      setAgentlessPackageAndAgentPolicies(
        !legacyAgentlessData?.items ? [] : legacyAgentlessData.items.map(mapPoliciesData)
      );
      return;
    }
    // Expansion needs the full manifest (see `agentlessFullPackageInfo` above); wait for it so we
    // don't hydrate against the input-less detail-page `packageInfo`.
    if (!agentlessData?.items || !agentlessFullPackageInfo) {
      setAgentlessPackageAndAgentPolicies([]);
      return;
    }
    setAgentlessPackageAndAgentPolicies(
      agentlessData.items.map((agentlessPolicy, index) =>
        mapPoliciesData(
          agentlessPolicyToTableItem(agentlessPolicy, agentlessFullPackageInfo),
          index
        )
      )
    );
  }, [
    agentlessUIEnabled,
    agentlessData,
    legacyAgentlessData,
    mapPoliciesData,
    agentlessFullPackageInfo,
  ]);

  // Per-flag view of the active agentless source. Never read loading state from the inactive
  // source: a disabled react-query query reports `isLoading: true` forever.
  const agentlessTableSource = agentlessUIEnabled
    ? {
        total: agentlessData?.total ?? 0,
        isLoading: agentlessIsLoading || isAgentlessFullPackageInfoLoading,
        // The table needs both requests: a failed manifest fetch would otherwise leave the
        // table silently empty while the LIST-sourced count badge shows the real total.
        error: agentlessError ?? agentlessFullPackageInfoError ?? null,
        refresh: () => {
          refreshAgentlessPolicies();
          if (agentlessFullPackageInfoError) {
            refetchAgentlessFullPackageInfo();
          }
        },
      }
    : {
        total: legacyAgentlessData?.total ?? 0,
        isLoading: legacyAgentlessIsLoading,
        error: legacyAgentlessError,
        refresh: refreshLegacyAgentlessPolicies,
      };

  // if they arrive at this page and the package is not installed, send them to overview
  // this happens if they arrive with a direct url or they uninstall while on this tab
  // Check `addAgentToPolicyIdFromParams` otherwise right after installing a new integration the flyout won't open
  if (
    packageInstallStatus &&
    packageInstallStatus.status !== InstallStatus.installed &&
    !addAgentToPolicyIdFromParams
  ) {
    return (
      <Redirect to={getPath('integration_details_overview', { pkgkey: `${name}-${version}` })} />
    );
  }

  return (
    <AgentPolicyRefreshContext.Provider
      value={{
        refresh: () => {
          refreshAgentBasedPolicies();
          agentlessTableSource.refresh();
        },
      }}
    >
      <EuiFlexGroup alignItems="flexStart">
        {embedded ? null : <SideBarColumn grow={1} />}
        <EuiFlexItem grow={7}>
          {!canHaveAgentlessPolicies ? (
            <AgentBasedPackagePoliciesTable
              isLoading={agentBasedIsLoading}
              packagePolicies={agentBasedPackageAndAgentPolicies}
              packagePoliciesTotal={agentBasedData?.total ?? 0}
              refreshPackagePolicies={refreshAgentBasedPolicies}
              pagination={{
                pagination: agentBasedPagination,
                pageSizeOptions: agentBasedPageSizeOptions,
                setPagination: agentBasedSetPagination,
              }}
              addAgentToPolicyIdFromParams={addAgentToPolicyIdFromParams}
              showAddAgentHelpForPolicyId={showAddAgentHelpForPolicyId}
              from={embedded ? 'installed-integrations' : undefined}
            />
          ) : (
            <>
              <EuiAccordion
                id="agentBasedAccordion"
                initialIsOpen={true}
                buttonContent={
                  <EuiFlexGroup
                    justifyContent="center"
                    alignItems="center"
                    gutterSize="s"
                    responsive={false}
                  >
                    <EuiFlexItem grow={false}>
                      <EuiText size="m">
                        <h4>
                          <FormattedMessage
                            id="xpack.fleet.epm.packageDetails.integrationList.agentlessHeader"
                            defaultMessage="Elastic Managed Integration"
                          />
                        </h4>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiNotificationBadge color="subdued" size="m">
                        <h4>{agentlessTableSource.total}</h4>
                      </EuiNotificationBadge>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                }
              >
                <EuiSpacer size="m" />
                <EuiPanel hasBorder={true} hasShadow={false}>
                  <AgentlessPackagePoliciesTable
                    isLoading={agentlessTableSource.isLoading}
                    error={agentlessTableSource.error}
                    packagePolicies={agentlessPackageAndAgentPolicies}
                    packagePoliciesTotal={agentlessTableSource.total}
                    refreshPackagePolicies={agentlessTableSource.refresh}
                    pagination={{
                      pagination: agentlessPagination,
                      pageSizeOptions: agentlessPageSizeOptions,
                      setPagination: agentlessSetPagination,
                    }}
                    from={embedded ? 'installed-integrations' : undefined}
                  />
                </EuiPanel>
              </EuiAccordion>
              <EuiSpacer size="l" />
              <EuiAccordion
                id="agentBasedAccordion"
                initialIsOpen={true}
                buttonContent={
                  <EuiFlexGroup
                    justifyContent="center"
                    alignItems="center"
                    gutterSize="s"
                    responsive={false}
                  >
                    <EuiFlexItem grow={false}>
                      <EuiText size="m">
                        <h4>
                          <FormattedMessage
                            id="xpack.fleet.epm.packageDetails.integrationList.agentBasedHeader"
                            defaultMessage="Agent-based"
                          />
                        </h4>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiNotificationBadge color="subdued" size="m">
                        <h4>{agentBasedData?.total ?? 0}</h4>
                      </EuiNotificationBadge>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                }
              >
                <EuiSpacer size="m" />
                <EuiPanel hasBorder={true} hasShadow={false}>
                  <AgentBasedPackagePoliciesTable
                    isLoading={agentBasedIsLoading}
                    packagePolicies={agentBasedPackageAndAgentPolicies}
                    packagePoliciesTotal={agentBasedData?.total ?? 0}
                    refreshPackagePolicies={refreshAgentBasedPolicies}
                    pagination={{
                      pagination: agentBasedPagination,
                      pageSizeOptions: agentBasedPageSizeOptions,
                      setPagination: agentBasedSetPagination,
                    }}
                    addAgentToPolicyIdFromParams={addAgentToPolicyIdFromParams}
                    showAddAgentHelpForPolicyId={showAddAgentHelpForPolicyId}
                    from={embedded ? 'installed-integrations' : undefined}
                  />
                </EuiPanel>
              </EuiAccordion>
            </>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </AgentPolicyRefreshContext.Provider>
  );
};
