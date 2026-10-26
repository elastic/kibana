/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { EuiFlexGroup, EuiFlexItem, EuiProgress, EuiEmptyPrompt } from '@elastic/eui';
import { AlertsTable } from '@kbn/response-ops-alerts-table';
import type { BulkActionsPanelConfig } from '@kbn/response-ops-alerts-table/types';
import React, { useMemo } from 'react';
import type { SetRequired } from 'type-fest';
import { ALERTS_EMPTY_DESCRIPTION, REMOVE_FROM_CASE } from '../translations';
import { useKibana } from '../../../../common/lib/kibana';
import { useGetFeatureIds } from '../../../../containers/use_get_feature_ids';
import { getManualAlertIds } from '../../../../../common/utils/attachments/manual_alert_ids';
import type { CommonAttachmentListViewProps } from '../../../../client/attachment_framework/types';
import { getRemoveFromCaseActions } from '../../../../client/attachment_framework/remove_from_case_actions';
import type { StackAlertsTableContext } from './stack_alert_actions_cell';
import { StackAlertActionsCell } from './stack_alert_actions_cell';

export const REMOVE_STACK_ALERTS_FROM_CASE_TEST_ID = 'remove-stack-alerts-from-case';

export const StackAlertTabContent = ({ caseData, onRemove }: CommonAttachmentListViewProps) => {
  const { services } = useKibana();
  const { data, http, notifications, fieldFormats, application, licensing, settings } =
    services as SetRequired<typeof services, 'licensing'>;

  const alertIds = useMemo(() => getManualAlertIds(caseData.comments), [caseData.comments]);
  const alertIdsQuery = useMemo(
    (): NonNullable<QueryDslQueryContainer> => ({
      ids: { values: alertIds },
    }),
    [alertIds]
  );

  const alertsTableServices = useMemo(
    () => ({ data, http, notifications, fieldFormats, application, settings, licensing }),
    [data, http, notifications, fieldFormats, application, settings, licensing]
  );

  const removeActions = useMemo(
    () =>
      getRemoveFromCaseActions({
        onRemove,
        key: REMOVE_STACK_ALERTS_FROM_CASE_TEST_ID,
        label: REMOVE_FROM_CASE,
      }),
    [onRemove]
  );

  const additionalContext = useMemo<StackAlertsTableContext>(
    () => ({ onRemoveFromCase: removeActions?.onRemoveFromCase }),
    [removeActions]
  );

  // Not memoized: the alerts table appends its default bulk actions to this panel in place.
  const removeBulkActions: BulkActionsPanelConfig[] | undefined = removeActions && [
    { id: 0, items: [removeActions.bulkAction] },
  ];

  const { isLoading, data: alertData } = useGetFeatureIds(alertIds, true);

  if (alertIdsQuery.ids?.values?.length === 0) {
    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiEmptyPrompt
            data-test-subj="caseViewAlertsEmpty"
            iconType="casesApp"
            iconColor="default"
            titleSize="xs"
            body={<p>{ALERTS_EMPTY_DESCRIPTION}</p>}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (isLoading) {
    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiProgress size="xs" color="primary" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexItem data-test-subj="case-view-alerts">
      <AlertsTable<StackAlertsTableContext>
        id={`case-details-alerts-${caseData.owner}`}
        ruleTypeIds={alertData?.ruleTypeIds ?? []}
        consumers={alertData?.featureIds}
        query={alertIdsQuery}
        showAlertStatusWithFlapping
        services={alertsTableServices}
        additionalBulkActions={removeBulkActions}
        additionalContext={additionalContext}
        renderActionsCell={removeActions ? StackAlertActionsCell : undefined}
      />
    </EuiFlexItem>
  );
};

StackAlertTabContent.displayName = 'StackAlertTabContent';
