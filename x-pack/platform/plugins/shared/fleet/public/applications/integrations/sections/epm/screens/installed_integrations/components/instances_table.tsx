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
    'xpack.fleet.epmInstalledIntegrations.instances.managedIntegrationMethod',
    { defaultMessage: 'Managed integration' }
  ),
  ecf: i18n.translate('xpack.fleet.epmInstalledIntegrations.instances.ecfMethod', {
    defaultMessage: 'Elastic Cloud Forwarder',
  }),
  agent_based: i18n.translate('xpack.fleet.epmInstalledIntegrations.instances.agentBasedMethod', {
    defaultMessage: 'Agent-based',
  }),
};

/** Services named in a Services tooltip before the rest are only counted. */
const MAX_TOOLTIP_SERVICES = 3;

/** `<method>: A, B, C and 2 more services`. */
const getServicesTooltip = (method: DeploymentMethod, serviceNames: string[]): string => {
  const named = serviceNames.slice(0, MAX_TOOLTIP_SERVICES).join(', ');
  const moreCount = serviceNames.length - MAX_TOOLTIP_SERVICES;
  const services =
    moreCount > 0
      ? i18n.translate('xpack.fleet.epmInstalledIntegrations.instances.moreServices', {
          defaultMessage:
            '{named} and {moreCount, plural, one {# more service} other {# more services}}',
          values: { named, moreCount },
        })
      : named;
  return `${DEPLOYMENT_METHOD_LABELS[method]}: ${services}`;
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

export const InstancesTable: React.FunctionComponent<{
  instances: CloudOnboardingDeploymentListItem[];
  /** The package being viewed, whose deployed version the Version column shows. */
  packageName: string;
}> = ({ instances, packageName }) => {
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
      name: i18n.translate('xpack.fleet.epmInstalledIntegrations.instances.nameColumn', {
        defaultMessage: 'Instance',
      }),
      render: (_: unknown, item: CloudOnboardingDeploymentListItem) => (
        <EuiLink onClick={() => openInstance(item.id)} data-test-subj="instanceLink">
          {item.integrationName || item.deploymentName || item.id}
        </EuiLink>
      ),
    },
    {
      name: i18n.translate('xpack.fleet.epmInstalledIntegrations.instances.servicesColumn', {
        defaultMessage: 'Services',
      }),
      render: (item: CloudOnboardingDeploymentListItem) => (
        <SlashSeparatedValues
          values={DEPLOYMENT_METHOD_ORDER.flatMap((method) => {
            const serviceIds = item.servicesByMethod[method] ?? [];
            if (serviceIds.length === 0) return [];
            return [
              {
                key: method,
                value: serviceIds.length,
                tooltip: getServicesTooltip(
                  method,
                  serviceIds.map((id) => item.serviceNames?.[id] ?? id)
                ),
              },
            ];
          })}
        />
      ),
    },
    {
      name: i18n.translate('xpack.fleet.epmInstalledIntegrations.instances.versionColumn', {
        defaultMessage: 'Version',
      }),
      render: (item: CloudOnboardingDeploymentListItem) =>
        item.packages.find((pkg) => pkg.name === packageName)?.version ?? EMPTY_CELL,
    },
    {
      field: 'updatedBy',
      name: i18n.translate('xpack.fleet.epmInstalledIntegrations.instances.updatedByColumn', {
        defaultMessage: 'Last updated by',
      }),
      render: (updatedBy?: string) => updatedBy ?? EMPTY_CELL,
    },
    {
      field: 'updatedAt',
      name: i18n.translate('xpack.fleet.epmInstalledIntegrations.instances.updatedAtColumn', {
        defaultMessage: 'Last updated',
      }),
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
      name: i18n.translate('xpack.fleet.epmInstalledIntegrations.instances.agentsColumn', {
        defaultMessage: 'Agents',
      }),
      render: (agentCount: number) => (agentCount > 0 ? agentCount : EMPTY_CELL),
    },
  ];

  return (
    <EuiBasicTable
      items={instances}
      itemId="id"
      columns={columns}
      tableCaption={i18n.translate('xpack.fleet.epmInstalledIntegrations.instances.tableCaption', {
        defaultMessage: 'Instances',
      })}
      rowProps={{ 'data-test-subj': 'instancesTableRow' }}
    />
  );
};
