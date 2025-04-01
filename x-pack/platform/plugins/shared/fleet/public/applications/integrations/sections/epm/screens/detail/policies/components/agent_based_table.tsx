/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { stringify, parse } from 'query-string';
import React, { useEffect, useState } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import {
  EuiBasicTable,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButton,
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedRelative, FormattedMessage } from '@kbn/i18n-react';

import type { AgentPolicy, InMemoryPackagePolicy, PackagePolicy } from '../../../../../../types';
import type { usePagination } from '../../../../../../hooks';
import { useLink, useAuthz, useMultipleAgentPolicies } from '../../../../../../hooks';
import {
  AgentEnrollmentFlyout,
  MultipleAgentPoliciesSummaryLine,
  AgentPolicySummaryLine,
  PackagePolicyActionsMenu,
} from '../../../../../../components';

import { Persona } from '../persona';

import { PackagePolicyAgentsCell } from './package_policy_agents_cell';

export const AgentBasedPackagePoliciesTable = ({
  isLoading,
  packagePolicies,
  packagePoliciesTotal,
  refreshPackagePolicies,
  pagination,
  addAgentToPolicyIdFromParams,
  showAddAgentHelpForPolicyId,
}: {
  isLoading: boolean;
  packagePolicies: Array<{
    agentPolicies: AgentPolicy[];
    packagePolicy: InMemoryPackagePolicy;
    rowIndex: number;
  }>;
  packagePoliciesTotal: number;
  refreshPackagePolicies: () => void;
  pagination: ReturnType<typeof usePagination>;
  addAgentToPolicyIdFromParams?: string | null;
  showAddAgentHelpForPolicyId?: string | null;
}) => {
  const { getHref } = useLink();
  const { search } = useLocation();
  const history = useHistory();

  const [selectedTableIndex, setSelectedTableIndex] = useState<number | undefined>();
  const { canUseMultipleAgentPolicies } = useMultipleAgentPolicies();
  const canWriteIntegrationPolicies = useAuthz().integrations.writeIntegrationPolicies;
  const canReadIntegrationPolicies = useAuthz().integrations.readIntegrationPolicies;
  const canReadAgentPolicies = useAuthz().fleet.readAgentPolicies;
  const canShowMultiplePoliciesCell =
    canUseMultipleAgentPolicies && canReadIntegrationPolicies && canReadAgentPolicies;

  // Show tour help for adding agents to a policy
  const addAgentHelpForPolicyId = packagePolicies.find(({ agentPolicies }) =>
    agentPolicies.find((agentPolicy) => agentPolicy.id === showAddAgentHelpForPolicyId)
  )?.packagePolicy?.id;

  // Handle the "add agent" link displayed in post-installation toast notifications in the case
  // where a user is clicking the link while on the package policies listing page
  const [flyoutOpenForPolicyId, setFlyoutOpenForPolicyId] = useState<string | null>(
    addAgentToPolicyIdFromParams || null
  );
  useEffect(() => {
    const unlisten = history.listen((location) => {
      const params = new URLSearchParams(location.search);
      const addAgentToPolicyId = params.get('addAgentToPolicyId');

      if (addAgentToPolicyId) {
        setFlyoutOpenForPolicyId(addAgentToPolicyId);
      }
    });

    return () => unlisten();
  }, [history]);

  const selectedPolicies =
    selectedTableIndex !== undefined ? packagePolicies[selectedTableIndex] : undefined;
  const selectedAgentPolicies = selectedPolicies?.agentPolicies;
  const selectedPackagePolicy = selectedPolicies?.packagePolicy;
  const flyoutPolicy = selectedAgentPolicies?.length === 1 ? selectedAgentPolicies[0] : undefined;

  return (
    <>
      <EuiBasicTable<{
        agentPolicies: AgentPolicy[];
        packagePolicy: InMemoryPackagePolicy;
        rowIndex: number;
      }>
        items={packagePolicies || []}
        columns={[
          {
            field: 'packagePolicy.name',
            name: i18n.translate('xpack.fleet.epm.packageDetails.integrationList.name', {
              defaultMessage: 'Integration policy',
            }),
            render(_, { agentPolicies, packagePolicy }) {
              return (
                <EuiLink
                  className="eui-textTruncate"
                  data-test-subj="integrationNameLink"
                  href={getHref('integration_policy_edit', {
                    packagePolicyId: packagePolicy.id,
                  })}
                >
                  {packagePolicy.name}
                </EuiLink>
              );
            },
          },
          {
            field: 'packagePolicy.package.version',
            name: i18n.translate('xpack.fleet.epm.packageDetails.integrationList.version', {
              defaultMessage: 'Version',
            }),
            render(_version, { agentPolicies, packagePolicy }) {
              return (
                <EuiFlexGroup gutterSize="s" alignItems="center" wrap={true}>
                  <EuiFlexItem grow={false}>
                    <EuiText
                      size="s"
                      className="eui-textNoWrap"
                      data-test-subj="packageVersionText"
                    >
                      <FormattedMessage
                        id="xpack.fleet.epm.packageDetails.integrationList.packageVersion"
                        defaultMessage="v{version}"
                        values={{ version: _version }}
                      />
                    </EuiText>
                  </EuiFlexItem>

                  {agentPolicies.length > 0 && packagePolicy.hasUpgrade && (
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        size="s"
                        minWidth="0"
                        href={`${getHref('upgrade_package_policy', {
                          policyId: agentPolicies[0].id,
                          packagePolicyId: packagePolicy.id,
                        })}?from=integrations-policy-list`}
                        data-test-subj="integrationPolicyUpgradeBtn"
                        isDisabled={!canWriteIntegrationPolicies}
                      >
                        <FormattedMessage
                          id="xpack.fleet.policyDetails.packagePoliciesTable.upgradeButton"
                          defaultMessage="Upgrade"
                        />
                      </EuiButton>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              );
            },
          },
          {
            field: 'packagePolicy.policy_ids',
            name: i18n.translate('xpack.fleet.epm.packageDetails.integrationList.agentPolicy', {
              defaultMessage: 'Agent policies',
            }),
            truncateText: true,
            render(ids, { agentPolicies, packagePolicy }) {
              return agentPolicies.length > 0 ? (
                canShowMultiplePoliciesCell ? (
                  <MultipleAgentPoliciesSummaryLine
                    policies={agentPolicies}
                    packagePolicyId={packagePolicy.id}
                    onAgentPoliciesChange={refreshPackagePolicies}
                  />
                ) : (
                  <AgentPolicySummaryLine policy={agentPolicies[0]} />
                )
              ) : ids.length === 0 ? (
                <EuiText color="subdued" size="xs">
                  <FormattedMessage
                    id="xpack.fleet.epm.packageDetails.integrationList.noAgentPolicies"
                    defaultMessage="No agent policies"
                  />
                </EuiText>
              ) : (
                <EuiText color="subdued" size="xs">
                  <EuiIcon size="m" type="warning" color="warning" />
                  &nbsp;
                  <FormattedMessage
                    id="xpack.fleet.epm.packageDetails.integrationList.agentPolicyDeletedWarning"
                    defaultMessage="Policy not found"
                  />
                </EuiText>
              );
            },
          },
          {
            field: 'packagePolicy.updated_by',
            name: i18n.translate('xpack.fleet.epm.packageDetails.integrationList.updatedBy', {
              defaultMessage: 'Last updated by',
            }),
            truncateText: true,
            render(updatedBy: PackagePolicy['updated_by']) {
              return <Persona size="s" name={updatedBy} title={updatedBy} />;
            },
          },
          {
            field: 'packagePolicy.updated_at',
            name: i18n.translate('xpack.fleet.epm.packageDetails.integrationList.updatedAt', {
              defaultMessage: 'Last updated',
            }),
            truncateText: true,
            render(updatedAt: PackagePolicy['updated_at']) {
              return (
                <span className="eui-textTruncate" title={updatedAt}>
                  <FormattedRelative value={updatedAt} />
                </span>
              );
            },
          },
          {
            field: '',
            name: i18n.translate('xpack.fleet.epm.packageDetails.integrationList.agentCount', {
              defaultMessage: 'Agents',
            }),
            render({
              agentPolicies,
              packagePolicy,
              rowIndex,
            }: {
              agentPolicies: AgentPolicy[];
              packagePolicy: InMemoryPackagePolicy;
              rowIndex: number;
            }) {
              if (agentPolicies.length === 0) {
                return (
                  <EuiText color="subdued" size="xs">
                    <FormattedMessage
                      id="xpack.fleet.epm.packageDetails.integrationList.noAgents"
                      defaultMessage="No agents"
                    />
                  </EuiText>
                );
              }
              return (
                <PackagePolicyAgentsCell
                  agentPolicies={agentPolicies}
                  onAddAgent={() => {
                    setSelectedTableIndex(rowIndex);
                    setFlyoutOpenForPolicyId(agentPolicies[0].id);
                  }}
                  hasHelpPopover={addAgentHelpForPolicyId === packagePolicy.id}
                />
              );
            },
          },
          {
            field: '',
            name: i18n.translate('xpack.fleet.epm.packageDetails.integrationList.actions', {
              defaultMessage: 'Actions',
            }),
            width: '8ch',
            align: 'right',
            render({
              agentPolicies,
              packagePolicy,
            }: {
              agentPolicies: AgentPolicy[];
              packagePolicy: InMemoryPackagePolicy;
            }) {
              const agentPolicy = agentPolicies[0]; // TODO: handle multiple agent policies
              return (
                <PackagePolicyActionsMenu
                  agentPolicies={agentPolicies}
                  packagePolicy={packagePolicy}
                  showAddAgent={true}
                  upgradePackagePolicyHref={
                    agentPolicy
                      ? `${getHref('upgrade_package_policy', {
                          policyId: agentPolicy.id,
                          packagePolicyId: packagePolicy.id,
                        })}?from=integrations-policy-list`
                      : undefined
                  }
                />
              );
            },
          },
        ]}
        loading={isLoading}
        data-test-subj="integrationPolicyTable"
        pagination={{
          pageIndex: pagination.pagination.currentPage - 1,
          pageSize: pagination.pagination.pageSize,
          totalItemCount: packagePoliciesTotal,
          pageSizeOptions: pagination.pageSizeOptions,
        }}
        onChange={({ page }: { page: { index: number; size: number } }) => {
          pagination.setPagination({
            currentPage: page.index + 1,
            pageSize: page.size,
          });
        }}
        noItemsMessage={
          isLoading ? (
            <FormattedMessage
              id="xpack.fleet.epm.packageDetails.integrationList.loadingPoliciesMessage"
              defaultMessage="Loading integration policies…"
            />
          ) : (
            <FormattedMessage
              id="xpack.fleet.epm.packageDetails.integrationList.noPoliciesMessage"
              defaultMessage="No integration policies"
            />
          )
        }
      />
      {flyoutOpenForPolicyId && selectedAgentPolicies && !isLoading && (
        <AgentEnrollmentFlyout
          onClose={() => {
            setFlyoutOpenForPolicyId(null);
            const { addAgentToPolicyId, ...rest } = parse(search);
            history.replace({ search: stringify(rest) });
          }}
          agentPolicy={flyoutPolicy}
          selectedAgentPolicies={selectedAgentPolicies}
          isIntegrationFlow={true}
          installedPackagePolicy={{
            name: selectedPackagePolicy?.package?.name || '',
            version: selectedPackagePolicy?.package?.version || '',
          }}
        />
      )}
    </>
  );
};
