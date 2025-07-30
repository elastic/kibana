/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiProgress } from '@elastic/eui';
import type { Alert } from '@kbn/alerting-types';
import { AlertsTable as DefaultAlertsTable } from '@kbn/response-ops-alerts-table';
import { SECURITY_SOLUTION_RULE_TYPE_IDS } from '@kbn/securitysolution-rules';
import React, { useCallback, useMemo, type ComponentType } from 'react';
import type { SetRequired } from 'type-fest';
import type { CaseUI } from '../../../../common';
import { SECURITY_SOLUTION_OWNER } from '../../../../common/constants';
import { CASE_VIEW_PAGE_TABS } from '../../../../common/types';
import { useKibana } from '../../../common/lib/kibana';
import { useGetFeatureIds } from '../../../containers/use_get_feature_ids';
import { CaseViewTabs } from '../case_view_tabs';
import type { CaseViewAlertsTableProps } from '../types';
import { CaseViewAlertsEmpty } from './case_view_alerts_empty';
import { getManualAlertIds } from './helpers';

interface CaseViewAlertsProps {
  caseData: CaseUI;
  onAlertsTableLoaded?: (eventIds: Array<Partial<{ _id: string }>>) => void;
  renderAlertsTable?: ComponentType<CaseViewAlertsTableProps>;
}

export const CaseViewAlerts = ({
  caseData,
  renderAlertsTable: CustomAlertsTable,
  onAlertsTableLoaded,
}: CaseViewAlertsProps) => {
  const { services } = useKibana();
  const { data, http, notifications, fieldFormats, application, licensing, settings } =
    services as SetRequired<typeof services, 'licensing'>;
  const alertIds = getManualAlertIds(caseData.comments);
  const alertIdsQuery = useMemo(
    () => ({
      ids: {
        values: alertIds,
      },
    }),
    [alertIds]
  );

  const { isLoading: isLoadingAlertFeatureIds, data: alertData } = useGetFeatureIds(
    alertIds,
    caseData.owner !== SECURITY_SOLUTION_OWNER
  );

  const onLoaded = useCallback(
    ({ alerts }: { alerts: Alert[] }) => onAlertsTableLoaded?.(alerts),
    [onAlertsTableLoaded]
  );

  if (alertIdsQuery.ids.values.length === 0) {
    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          <CaseViewTabs caseData={caseData} activeTab={CASE_VIEW_PAGE_TABS.ALERTS} />
          <CaseViewAlertsEmpty />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const AlertsTable =
    CustomAlertsTable ??
    (DefaultAlertsTable as NonNullable<CaseViewAlertsProps['renderAlertsTable']>);

  return isLoadingAlertFeatureIds ? (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiProgress size="xs" color="primary" />
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <EuiFlexItem data-test-subj="case-view-alerts">
      <CaseViewTabs caseData={caseData} activeTab={CASE_VIEW_PAGE_TABS.ALERTS} />
      <AlertsTable
        id={`case-details-alerts-${caseData.owner}`}
        ruleTypeIds={
          caseData.owner === SECURITY_SOLUTION_OWNER
            ? SECURITY_SOLUTION_RULE_TYPE_IDS
            : alertData?.ruleTypeIds ?? []
        }
        consumers={alertData?.featureIds}
        query={alertIdsQuery}
        showAlertStatusWithFlapping={caseData.owner !== SECURITY_SOLUTION_OWNER}
        onLoaded={onLoaded}
        // Only provide the services to the default alerts table.
        // Spreading from object to avoid incorrectly overriding
        // services to `undefined` in custom solution tables
        {...(CustomAlertsTable
          ? {}
          : {
              services: {
                data,
                http,
                notifications,
                fieldFormats,
                application,
                settings,
                // In the Cases UI the licensing service is defined
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                licensing: licensing!,
              },
            })}
      />
    </EuiFlexItem>
  );
};
CaseViewAlerts.displayName = 'CaseViewAlerts';
