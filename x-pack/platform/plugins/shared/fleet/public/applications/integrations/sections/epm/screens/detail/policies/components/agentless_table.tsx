/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo, useState } from 'react';
import type { HorizontalAlignment } from '@elastic/eui';
import { EuiBadge, EuiBasicTable, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedRelative, FormattedMessage } from '@kbn/i18n-react';

import type {
  Agent,
  AgentPolicy,
  InMemoryPackagePolicy,
  PackagePolicy,
} from '../../../../../../types';
import { AGENTS_PREFIX, SO_SEARCH_LIMIT } from '../../../../../../../../../common/constants';
import type { usePagination } from '../../../../../../hooks';
import { useLink, sendGetAgents, useAuthz, useStartServices } from '../../../../../../hooks';
import {
  Loading,
  PackagePolicyActionsMenu,
  AgentlessEnrollmentFlyout,
} from '../../../../../../components';

import { Persona } from '../persona';
import { AgentHealth } from '../../../../../../../fleet/sections/agents/components';

const REFRESH_INTERVAL_MS = 30000;

export const AgentlessPackagePoliciesTable = ({
  isLoading,
  packagePolicies,
  packagePoliciesTotal,
  refreshPackagePolicies,
  pagination,
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
}) => {
  const core = useStartServices();
  const { notifications } = core;
  const authz = useAuthz();
  const { getHref } = useLink();
  const [isAgentsLoading, setIsAgentsLoading] = useState<boolean>(false);
  const [agentsByPolicyId, setAgentsByPolicyId] = useState<Record<string, Agent>>({});
  const canReadAgents = authz.fleet.readAgents;

  // Kuery for all agents enrolled into the agent policies associated with the package policies
  // We use the first agent policy as agentless package policies have a 1:1 relationship with agent policies
  // Maximum # of agent policies is 50, based on the max page size in UI
  const agentsKuery = useMemo(() => {
    return packagePolicies
      .reduce((policyIds, { agentPolicies }) => {
        return [...policyIds, ...(agentPolicies[0] ? [agentPolicies[0]?.id] : [])];
      }, [] as string[])
      .map((policyId) => `${AGENTS_PREFIX}.policy_id: "${policyId}"`)
      .join(' or ');
  }, [packagePolicies]);

  // Fetch agents using above kuery, if the user has access to read agents
  // Polls every 30 seconds
  useEffect(() => {
    const fetchAgents = async () => {
      const { data: agentsData, error } = await sendGetAgents({
        perPage: SO_SEARCH_LIMIT,
        kuery: agentsKuery,
      });

      setAgentsByPolicyId(
        (agentsData?.items || []).reduce((acc, agent) => {
          if (agent.policy_id) {
            acc[agent.policy_id] = agent;
          }
          return acc;
        }, {} as Record<string, Agent>)
      );

      if (error) {
        notifications.toasts.addError(error, {
          title: i18n.translate(
            'xpack.fleet.epm.packageDetails.integrationList.agentlessStatusError',
            {
              defaultMessage: 'Error fetching agentless status information',
            }
          ),
        });
      }
      setIsAgentsLoading(false);
    };

    if (canReadAgents) {
      setIsAgentsLoading(true);
      fetchAgents();
      const interval = setInterval(() => {
        fetchAgents();
      }, REFRESH_INTERVAL_MS);
      return () => clearInterval(interval);
    }
  }, [agentsKuery, canReadAgents, notifications.toasts]);

  // Flyout state
  const [flyoutOpenForPolicyId, setFlyoutOpenForPolicyId] = useState<string>();
  const [flyoutPackagePolicy, setFlyoutPackagePolicy] = useState<PackagePolicy>();
  const [flyoutAgentPolicy, setFlyoutAgentPolicy] = useState<AgentPolicy>();

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
                  data-test-subj="agentlessIntegrationNameLink"
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
          ...(canReadAgents
            ? [
                {
                  field: '',
                  name: i18n.translate(
                    'xpack.fleet.epm.packageDetails.integrationList.agentlessStatus',
                    {
                      defaultMessage: 'Status',
                    }
                  ),
                  align: 'left' as HorizontalAlignment,
                  render({
                    agentPolicies,
                    packagePolicy,
                  }: {
                    agentPolicies: AgentPolicy[];
                    packagePolicy: InMemoryPackagePolicy;
                    rowIndex: number;
                  }) {
                    if (isAgentsLoading) {
                      return <Loading size="s" />;
                    }
                    // Use the first agent policy ID associated with the package policy
                    // because agentless package policies are only associated with one agent policy
                    const agentPolicy = agentPolicies[0];
                    const agent =
                      (agentPolicy?.id && agentsByPolicyId[agentPolicy.id]) || undefined;

                    // Status badge click handler
                    const statusBadgeProps = {
                      onClick: () => {
                        setFlyoutOpenForPolicyId(packagePolicy.id);
                        setFlyoutPackagePolicy(packagePolicy);
                        setFlyoutAgentPolicy(agentPolicy);
                      },
                      'data-test-subj': 'agentlessStatusBadge',
                      onClickAriaLabel: i18n.translate(
                        'xpack.fleet.epm.packageDetails.integrationList.agentlessStatusAriaLabel',
                        {
                          defaultMessage: 'Open status details',
                        }
                      ),
                    };

                    return agent ? (
                      <AgentHealth agent={agent} {...statusBadgeProps} />
                    ) : (
                      <EuiBadge color="default" {...statusBadgeProps}>
                        <FormattedMessage
                          id="xpack.fleet.packageDetails.integrationList.pendingAgentlessStatus"
                          defaultMessage="Pending"
                        />
                      </EuiBadge>
                    );
                  },
                },
              ]
            : []),
          {
            field: '',
            name: i18n.translate('xpack.fleet.epm.packageDetails.integrationList.actions', {
              defaultMessage: 'Actions',
            }),
            width: '8ch',
            align: 'right' as HorizontalAlignment,
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
              id="xpack.fleet.epm.packageDetails.integrationList.noAgentlessPoliciesMessage"
              defaultMessage="No agentless integration policies"
            />
          )
        }
      />
      {flyoutOpenForPolicyId && flyoutPackagePolicy && (
        <AgentlessEnrollmentFlyout
          onClose={() => {
            setFlyoutOpenForPolicyId(undefined);
            setFlyoutPackagePolicy(undefined);
            setFlyoutAgentPolicy(undefined);
          }}
          packagePolicy={flyoutPackagePolicy}
          agentPolicy={flyoutAgentPolicy}
        />
      )}
    </>
  );
};
