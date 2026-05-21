/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CompactLogoIcon } from './compact_logo_icon';
import type { AwsService } from './aws_services_data';

/** Prototype dashboard counts per installed AWS logs integration (demo). */
const PROTOTYPE_DASHBOARD_COUNT_BY_SERVICE_ID: Readonly<Record<string, number>> = {
  apigateway_logs: 2,
  cloudfront_logs: 1,
  cloudtrail: 3,
  cloudwatch_logs: 6,
  config: 2,
  ec2_logs: 1,
  elb_logs: 2,
  emr_logs: 1,
  firewall_logs: 1,
  guardduty: 3,
  inspector: 1,
  lambda_logs: 2,
  securityhub_findings: 4,
  securityhub_findings_full_posture: 2,
  securityhub_insights: 1,
  waf: 2,
};

const DEFAULT_PROTOTYPE_DASHBOARD_COUNT = 2;

const TABLE_INSET_PADDING_PX = 16;

export interface AwsCatalogInstalledIntegrationRow {
  readonly id: string;
  readonly name: string;
  readonly logoUrl: string;
  readonly dashboardCount: number;
}

export interface AwsCatalogInstalledIntegrationsTableProps {
  readonly catalog: readonly AwsService[];
  readonly selectedServiceIds: ReadonlySet<string>;
  readonly onSeeData: () => void;
}

function getPrototypeDashboardCount(serviceId: string): number {
  return PROTOTYPE_DASHBOARD_COUNT_BY_SERVICE_ID[serviceId] ?? DEFAULT_PROTOTYPE_DASHBOARD_COUNT;
}

export const AwsCatalogInstalledIntegrationsTable: React.FC<
  AwsCatalogInstalledIntegrationsTableProps
> = ({ catalog, selectedServiceIds, onSeeData }) => {
  const items = useMemo((): AwsCatalogInstalledIntegrationRow[] => {
    const byId = new Map(catalog.map((service) => [service.id, service]));
    return [...selectedServiceIds]
      .map((serviceId) => byId.get(serviceId))
      .filter((service): service is AwsService => service !== undefined)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((service) => ({
        id: service.id,
        name: service.name,
        logoUrl: service.logoUrl,
        dashboardCount: getPrototypeDashboardCount(service.id),
      }));
  }, [catalog, selectedServiceIds]);

  const columns = useMemo(
    (): Array<EuiBasicTableColumn<AwsCatalogInstalledIntegrationRow>> => [
      {
        field: 'name',
        name: i18n.translate('xpack.streams.dataSources.awsInstalledIntegrations.integrationColumn', {
          defaultMessage: 'Integration',
        }),
        render: (name: string, item: AwsCatalogInstalledIntegrationRow) => (
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <CompactLogoIcon src={item.logoUrl} alt={name} />
            </EuiFlexItem>
            <EuiFlexItem grow={true} style={{ minWidth: 0 }}>
              <span>{name}</span>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
      {
        name: i18n.translate('xpack.streams.dataSources.awsInstalledIntegrations.statusColumn', {
          defaultMessage: 'Status',
        }),
        width: '120px',
        render: () => (
          <EuiBadge color="success">
            {i18n.translate('xpack.streams.dataSources.awsInstalledIntegrations.statusSuccessful', {
              defaultMessage: 'Successful',
            })}
          </EuiBadge>
        ),
      },
      {
        field: 'dashboardCount',
        name: i18n.translate('xpack.streams.dataSources.awsInstalledIntegrations.dashboardsColumn', {
          defaultMessage: 'Dashboards',
        }),
        width: '110px',
        render: (dashboardCount: number, item: AwsCatalogInstalledIntegrationRow) => (
          <EuiLink
            onClick={onSeeData}
            data-test-subj={`streamsAwsCatalogInstalledIntegrationSeeData-${item.id}`}
          >
            {dashboardCount}
          </EuiLink>
        ),
      },
    ],
    [onSeeData]
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <div data-test-subj="streamsAwsCatalogInstalledIntegrationsTable">
      <EuiSpacer size="m" />
      <EuiPanel color="subdued" paddingSize="m" hasShadow={false} hasBorder={false}>
        <EuiPanel
          paddingSize="none"
          hasBorder
          css={css`
            padding: ${TABLE_INSET_PADDING_PX}px;
          `}
        >
          <EuiBasicTable<AwsCatalogInstalledIntegrationRow>
            items={items}
            columns={columns}
            rowHeader="name"
            tableLayout="auto"
            data-test-subj="streamsAwsCatalogInstalledIntegrationsTableBody"
          />
        </EuiPanel>
      </EuiPanel>
    </div>
  );
};
