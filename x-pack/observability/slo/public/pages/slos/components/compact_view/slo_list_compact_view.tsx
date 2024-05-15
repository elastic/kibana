/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  DefaultItemAction,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiSkeletonRectangle,
  EuiText,
  EuiToolTip,
  EuiFlexGroup,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import { ALL_VALUE, SLOWithSummaryResponse } from '@kbn/slo-schema';
import { useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { RulesParams } from '@kbn/observability-plugin/public';
import { rulesLocatorID } from '@kbn/observability-plugin/common';
import { SLO_BURN_RATE_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { sloFeatureId } from '@kbn/observability-plugin/common';
import { useGetFilteredRuleTypes } from '../../../../hooks/use_get_filtered_rule_types';
import { useKibana } from '../../../../utils/kibana_react';
import { SloTagsList } from '../common/slo_tags_list';
import { useCloneSlo } from '../../../../hooks/use_clone_slo';
import { paths } from '../../../../../common/locators/paths';
import { SloDeleteConfirmationModal } from '../../../../components/slo/delete_confirmation_modal/slo_delete_confirmation_modal';
import { SloStatusBadge } from '../../../../components/slo/slo_status_badge';
import { SloActiveAlertsBadge } from '../../../../components/slo/slo_status_badge/slo_active_alerts_badge';
import { sloKeys } from '../../../../hooks/query_key_factory';
import { useCapabilities } from '../../../../hooks/use_capabilities';
import { useDeleteSlo } from '../../../../hooks/use_delete_slo';
import { useFetchActiveAlerts } from '../../../../hooks/use_fetch_active_alerts';
import { useFetchHistoricalSummary } from '../../../../hooks/use_fetch_historical_summary';
import { useFetchRulesForSlo } from '../../../../hooks/use_fetch_rules_for_slo';
import { formatHistoricalData } from '../../../../utils/slo/chart_data_formatter';
import { SloRulesBadge } from '../badges/slo_rules_badge';
import { SloListEmpty } from '../slo_list_empty';
import { SloListError } from '../slo_list_error';
import { SloSparkline } from '../slo_sparkline';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { SLOGroupings } from '../common/slo_groupings';

export interface Props {
  sloList: SLOWithSummaryResponse[];
  loading: boolean;
  error: boolean;
}

export function SloListCompactView({ sloList, loading, error }: Props) {
  const {
    application: { navigateToUrl },
    http: { basePath },
    uiSettings,
    share: {
      url: { locators },
    },
    triggersActionsUi: { getAddRuleFlyout: AddRuleFlyout },
  } = useKibana().services;

  const percentFormat = uiSettings.get('format:percent:defaultPattern');
  const sloIdsAndInstanceIds = sloList.map(
    (slo) => [slo.id, slo.instanceId ?? ALL_VALUE] as [string, string]
  );

  const { hasWriteCapabilities } = useCapabilities();
  const filteredRuleTypes = useGetFilteredRuleTypes();

  const queryClient = useQueryClient();
  const { mutate: deleteSlo } = useDeleteSlo();

  const [sloToAddRule, setSloToAddRule] = useState<SLOWithSummaryResponse | undefined>(undefined);
  const [sloToDelete, setSloToDelete] = useState<SLOWithSummaryResponse | undefined>(undefined);

  const handleDeleteConfirm = () => {
    if (sloToDelete) {
      deleteSlo({ id: sloToDelete.id, name: sloToDelete.name });
    }
    setSloToDelete(undefined);
  };

  const handleDeleteCancel = () => {
    setSloToDelete(undefined);
  };

  const handleSavedRule = async () => {
    queryClient.invalidateQueries({ queryKey: sloKeys.rules(), exact: false });
  };

  const { data: activeAlertsBySlo } = useFetchActiveAlerts({ sloIdsAndInstanceIds });
  const { data: rulesBySlo } = useFetchRulesForSlo({
    sloIds: sloIdsAndInstanceIds.map((item) => item[0]),
  });
  const { isLoading: historicalSummaryLoading, data: historicalSummaries = [] } =
    useFetchHistoricalSummary({
      list: sloList.map((slo) => ({ sloId: slo.id, instanceId: slo.instanceId ?? ALL_VALUE })),
    });

  const navigateToClone = useCloneSlo();

  const actions: Array<DefaultItemAction<SLOWithSummaryResponse>> = [
    {
      type: 'icon',
      icon: 'inspect',
      name: i18n.translate('xpack.slo.item.actions.details', {
        defaultMessage: 'Details',
      }),
      description: i18n.translate('xpack.slo.item.actions.details', {
        defaultMessage: 'Details',
      }),
      onClick: (slo: SLOWithSummaryResponse) => {
        const sloDetailsUrl = basePath.prepend(
          paths.sloDetails(
            slo.id,
            ![slo.groupBy].flat().includes(ALL_VALUE) && slo.instanceId ? slo.instanceId : undefined
          )
        );
        navigateToUrl(sloDetailsUrl);
      },
    },
    {
      type: 'icon',
      icon: 'pencil',
      name: i18n.translate('xpack.slo.item.actions.edit', {
        defaultMessage: 'Edit',
      }),
      description: i18n.translate('xpack.slo.item.actions.edit', {
        defaultMessage: 'Edit',
      }),
      'data-test-subj': 'sloActionsEdit',
      enabled: (_) => hasWriteCapabilities,
      onClick: (slo: SLOWithSummaryResponse) => {
        navigateToUrl(basePath.prepend(paths.sloEdit(slo.id)));
      },
    },
    {
      type: 'icon',
      icon: 'bell',
      name: i18n.translate('xpack.slo.item.actions.createRule', {
        defaultMessage: 'Create new alert rule',
      }),
      description: i18n.translate('xpack.slo.item.actions.createRule', {
        defaultMessage: 'Create new alert rule',
      }),
      'data-test-subj': 'sloActionsCreateRule',
      enabled: (_) => hasWriteCapabilities,
      onClick: (slo: SLOWithSummaryResponse) => {
        setSloToAddRule(slo);
      },
    },
    {
      type: 'icon',
      icon: 'gear',
      name: i18n.translate('xpack.slo.item.actions.manageRules', {
        defaultMessage: 'Manage rules',
      }),
      description: i18n.translate('xpack.slo.item.actions.manageRules', {
        defaultMessage: 'Manage rules',
      }),
      'data-test-subj': 'sloActionsManageRules',
      enabled: (_) => hasWriteCapabilities,
      onClick: (slo: SLOWithSummaryResponse) => {
        const locator = locators.get<RulesParams>(rulesLocatorID);
        locator?.navigate({ params: { sloId: slo.id } }, { replace: false });
      },
    },
    {
      type: 'icon',
      icon: 'copy',
      name: i18n.translate('xpack.slo.item.actions.clone', {
        defaultMessage: 'Clone',
      }),
      description: i18n.translate('xpack.slo.item.actions.clone', {
        defaultMessage: 'Clone',
      }),
      'data-test-subj': 'sloActionsClone',
      enabled: (_) => hasWriteCapabilities,
      onClick: (slo: SLOWithSummaryResponse) => {
        navigateToClone(slo);
      },
    },
    {
      type: 'icon',
      icon: 'trash',
      name: i18n.translate('xpack.slo.item.actions.delete', {
        defaultMessage: 'Delete',
      }),
      description: i18n.translate('xpack.slo.item.actions.delete', {
        defaultMessage: 'Delete',
      }),
      'data-test-subj': 'sloActionsDelete',
      enabled: (_) => hasWriteCapabilities,
      onClick: (slo: SLOWithSummaryResponse) => setSloToDelete(slo),
    },
  ];

  const columns: Array<EuiBasicTableColumn<SLOWithSummaryResponse>> = [
    {
      field: 'status',
      name: 'Status',
      render: (_, slo: SLOWithSummaryResponse) =>
        !slo.summary ? (
          <EuiSkeletonRectangle
            isLoading
            contentAriaLabel="Loading"
            width="54.16px"
            height="20px"
            borderRadius="s"
          />
        ) : (
          <EuiFlexGroup direction="column" gutterSize="s">
            <SloStatusBadge slo={slo} />
          </EuiFlexGroup>
        ),
    },
    {
      field: 'alerts',
      name: 'Alerts',
      truncateText: true,
      width: '5%',
      render: (_, slo: SLOWithSummaryResponse) => (
        <>
          <SloRulesBadge rules={rulesBySlo?.[slo.id]} onClick={() => setSloToAddRule(slo)} />
          <SloActiveAlertsBadge
            slo={slo}
            activeAlerts={activeAlertsBySlo.get(slo)}
            viewMode="compact"
          />
        </>
      ),
    },
    {
      field: 'name',
      name: 'Name',
      width: '15%',
      truncateText: { lines: 2 },
      'data-test-subj': 'sloItem',
      render: (_, slo: SLOWithSummaryResponse) => {
        const sloDetailsUrl = basePath.prepend(
          paths.sloDetails(
            slo.id,
            ![slo.groupBy].flat().includes(ALL_VALUE) && slo.instanceId ? slo.instanceId : undefined
          )
        );
        return (
          <EuiToolTip position="top" content={slo.name} display="block">
            <EuiText size="s">
              {slo.summary ? (
                <a data-test-subj="o11ySloListItemLink" href={sloDetailsUrl}>
                  {slo.name}
                </a>
              ) : (
                <span>{slo.name}</span>
              )}
            </EuiText>
          </EuiToolTip>
        );
      },
    },
    {
      field: 'tags',
      name: 'Tags',
      render: (tags: string[]) => <SloTagsList tags={tags} color="default" />,
    },
    {
      field: 'instance',
      name: 'Instance',
      render: (_, slo: SLOWithSummaryResponse) => {
        const groups = [slo.groupBy].flat();
        return !groups.includes(ALL_VALUE) ? (
          <SLOGroupings slo={slo} direction="column" />
        ) : (
          <span>{NOT_AVAILABLE_LABEL}</span>
        );
      },
    },
    {
      field: 'objective',
      name: 'Objective',
      render: (_, slo: SLOWithSummaryResponse) => numeral(slo.objective.target).format('0.00%'),
    },
    {
      field: 'sli',
      name: 'SLI value',
      truncateText: true,
      render: (_, slo: SLOWithSummaryResponse) =>
        !slo.summary || slo.summary.status === 'NO_DATA'
          ? NOT_AVAILABLE_LABEL
          : numeral(slo.summary.sliValue).format(percentFormat),
    },
    {
      field: 'historicalSli',
      name: 'Historical SLI',
      render: (_, slo: SLOWithSummaryResponse) => {
        const isSloFailed =
          (slo.summary && slo.summary.status === 'VIOLATED') ||
          (slo.summary && slo.summary.status === 'DEGRADING');
        const historicalSliData = formatHistoricalData(
          historicalSummaries.find(
            (historicalSummary) =>
              historicalSummary.sloId === slo.id &&
              historicalSummary.instanceId === (slo.instanceId ?? ALL_VALUE)
          )?.data,
          'sli_value'
        );
        return (
          <SloSparkline
            chart="line"
            id="sli_history"
            size="compact"
            state={isSloFailed ? 'error' : 'success'}
            data={historicalSliData}
            isLoading={historicalSummaryLoading}
          />
        );
      },
    },
    {
      field: 'errorBudgetRemaining',
      name: 'Budget remaining',
      truncateText: true,
      render: (_, slo: SLOWithSummaryResponse) =>
        !slo.summary || slo.summary.status === 'NO_DATA'
          ? NOT_AVAILABLE_LABEL
          : numeral(slo.summary.errorBudget.remaining).format(percentFormat),
    },
    {
      field: 'historicalErrorBudgetRemaining',
      name: 'Historical budget remaining',
      render: (_, slo: SLOWithSummaryResponse) => {
        const isSloFailed =
          (slo.summary && slo.summary.status === 'VIOLATED') ||
          (slo.summary && slo.summary.status === 'DEGRADING');
        const errorBudgetBurnDownData = formatHistoricalData(
          historicalSummaries.find(
            (historicalSummary) =>
              historicalSummary.sloId === slo.id &&
              historicalSummary.instanceId === (slo.instanceId ?? ALL_VALUE)
          )?.data,
          'error_budget_remaining'
        );
        return (
          <SloSparkline
            chart="area"
            id="error_budget_burn_down"
            state={isSloFailed ? 'error' : 'success'}
            size="compact"
            data={errorBudgetBurnDownData}
            isLoading={historicalSummaryLoading}
          />
        );
      },
    },

    {
      name: 'Actions',
      actions,
      width: '5%',
    },
  ];

  if (!loading && !error && sloList.length === 0) {
    return <SloListEmpty />;
  }

  if (!loading && error) {
    return <SloListError />;
  }

  return (
    <>
      <EuiBasicTable<SLOWithSummaryResponse>
        items={sloList}
        columns={columns}
        loading={loading}
        noItemsMessage={loading ? LOADING_SLOS_LABEL : NO_SLOS_FOUND}
        tableLayout="auto"
      />
      {sloToAddRule ? (
        <AddRuleFlyout
          consumer={sloFeatureId}
          filteredRuleTypes={filteredRuleTypes}
          ruleTypeId={SLO_BURN_RATE_RULE_TYPE_ID}
          initialValues={{
            name: `${sloToAddRule.name} burn rate rule`,
            params: { sloId: sloToAddRule.id },
          }}
          onSave={handleSavedRule}
          onClose={() => {
            setSloToAddRule(undefined);
          }}
          useRuleProducer
        />
      ) : null}

      {sloToDelete ? (
        <SloDeleteConfirmationModal
          slo={sloToDelete}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      ) : null}
    </>
  );
}

const LOADING_SLOS_LABEL = i18n.translate('xpack.slo.loadingSlosLabel', {
  defaultMessage: 'Loading SLOs ...',
});

const NO_SLOS_FOUND = i18n.translate('xpack.slo.noSlosFound', { defaultMessage: 'No SLOs found' });
