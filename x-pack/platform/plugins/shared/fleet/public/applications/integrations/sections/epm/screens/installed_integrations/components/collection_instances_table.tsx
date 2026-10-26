/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiBasicTable, EuiLink, EuiToolTip } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedRelative } from '@kbn/i18n-react';

import type {
  CloudOnboardingDeploymentListItem,
  DeploymentMethod,
} from '../../../../../../../../common/types';
import { useStartServices } from '../../../../../../../hooks';
import {
  ONBOARDING_APP_ID,
  ONBOARDING_AWS_PATH,
} from '../../../../../../../services/aws_onboarding_override';

const EMPTY_CELL = '-';

const DEPLOYMENT_METHOD_LABELS: Record<DeploymentMethod, string> = {
  managed_integration: i18n.translate(
    'xpack.fleet.epmInstalledIntegrations.collectionInstances.managedIntegrationMethod',
    { defaultMessage: 'Managed integration' }
  ),
  ecf: i18n.translate('xpack.fleet.epmInstalledIntegrations.collectionInstances.ecfMethod', {
    defaultMessage: 'ECF',
  }),
  agent_based: i18n.translate(
    'xpack.fleet.epmInstalledIntegrations.collectionInstances.agentBasedMethod',
    { defaultMessage: 'Agent-based' }
  ),
};

const DEPLOYMENT_METHOD_ORDER: DeploymentMethod[] = ['managed_integration', 'ecf', 'agent_based'];

/** Values side by side as `a / b`, each with its own tooltip, like the agent counts of Agent policies. */
const SlashSeparatedValues: React.FunctionComponent<{
  values: Array<{ key: string; value: React.ReactNode; tooltip: React.ReactNode }>;
}> = ({ values }) => {
  if (values.length === 0) return <>{EMPTY_CELL}</>;
  return (
    <>
      {values.map(({ key, value, tooltip }, index) => (
        <React.Fragment key={key}>
          {index > 0 ? ' / ' : null}
          <EuiToolTip content={tooltip}>
            <span tabIndex={0}>{value}</span>
          </EuiToolTip>
        </React.Fragment>
      ))}
    </>
  );
};

export const CollectionInstancesTable: React.FunctionComponent<{
  instances: CloudOnboardingDeploymentListItem[];
}> = ({ instances }) => {
  const { application } = useStartServices();

  // No `newSession` state: `deploymentId` makes the onboarding app hydrate from that session.
  const openInstance = useCallback(
    (deploymentId: string) => {
      application.navigateToApp(ONBOARDING_APP_ID, {
        path: `${ONBOARDING_AWS_PATH}?deploymentId=${encodeURIComponent(deploymentId)}`,
      });
    },
    [application]
  );

  const columns: Array<EuiBasicTableColumn<CloudOnboardingDeploymentListItem>> = [
    {
      field: 'integrationName',
      name: i18n.translate('xpack.fleet.epmInstalledIntegrations.collectionInstances.nameColumn', {
        defaultMessage: 'Collection instance',
      }),
      render: (_: unknown, item: CloudOnboardingDeploymentListItem) => (
        <EuiLink onClick={() => openInstance(item.id)} data-test-subj="collectionInstanceLink">
          {item.integrationName || item.deploymentName || item.id}
        </EuiLink>
      ),
    },
    {
      name: i18n.translate(
        'xpack.fleet.epmInstalledIntegrations.collectionInstances.servicesColumn',
        { defaultMessage: 'Services' }
      ),
      render: (item: CloudOnboardingDeploymentListItem) => (
        <SlashSeparatedValues
          values={DEPLOYMENT_METHOD_ORDER.flatMap((method) => {
            const serviceIds = item.servicesByMethod[method] ?? [];
            if (serviceIds.length === 0) return [];
            return [
              {
                key: method,
                value: serviceIds.length,
                tooltip: `${DEPLOYMENT_METHOD_LABELS[method]}: ${serviceIds
                  .map((id) => item.serviceNames?.[id] ?? id)
                  .join(', ')}`,
              },
            ];
          })}
        />
      ),
    },
    {
      name: i18n.translate(
        'xpack.fleet.epmInstalledIntegrations.collectionInstances.versionColumn',
        { defaultMessage: 'Version' }
      ),
      render: (item: CloudOnboardingDeploymentListItem) => (
        <SlashSeparatedValues
          values={item.packages.map((pkg) => ({
            key: pkg.name,
            value: pkg.version,
            tooltip: pkg.name,
          }))}
        />
      ),
    },
    {
      field: 'updatedBy',
      name: i18n.translate(
        'xpack.fleet.epmInstalledIntegrations.collectionInstances.updatedByColumn',
        { defaultMessage: 'Last updated by' }
      ),
      render: (updatedBy?: string) => updatedBy ?? EMPTY_CELL,
    },
    {
      field: 'updatedAt',
      name: i18n.translate(
        'xpack.fleet.epmInstalledIntegrations.collectionInstances.updatedAtColumn',
        { defaultMessage: 'Last updated' }
      ),
      render: (updatedAt?: string) =>
        updatedAt ? (
          <>
            <FormattedRelative value={new Date(updatedAt)} /> (
            <FormattedDate value={updatedAt} year="numeric" month="short" day="numeric" />)
          </>
        ) : (
          EMPTY_CELL
        ),
    },
    {
      field: 'agentCount',
      name: i18n.translate(
        'xpack.fleet.epmInstalledIntegrations.collectionInstances.agentsColumn',
        { defaultMessage: 'Agents' }
      ),
      render: (agentCount: number) => (agentCount > 0 ? agentCount : EMPTY_CELL),
    },
  ];

  return (
    <EuiBasicTable
      items={instances}
      itemId="id"
      columns={columns}
      tableCaption={i18n.translate(
        'xpack.fleet.epmInstalledIntegrations.collectionInstances.tableCaption',
        { defaultMessage: 'Collection instances' }
      )}
      rowProps={{ 'data-test-subj': 'collectionInstancesTableRow' }}
    />
  );
};
