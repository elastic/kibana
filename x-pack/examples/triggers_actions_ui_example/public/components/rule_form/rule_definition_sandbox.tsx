/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DocLinksStart } from '@kbn/core/public';
import type { HttpStart } from '@kbn/core-http-browser';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { AlertConsumers, RuleCreationValidConsumer } from '@kbn/rule-data-utils';
import { RuleForm, useLoadRuleTypesQuery, getRuleErrors, InitialRule } from '@kbn/alerts-ui-shared';

interface RuleDefinitionSandboxProps {
  data: DataPublicPluginStart;
  charts: ChartsPluginSetup;
  dataViews: DataViewsPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

export const VALID_CONSUMERS: RuleCreationValidConsumer[] = [
  AlertConsumers.LOGS,
  AlertConsumers.INFRASTRUCTURE,
  AlertConsumers.STACK_ALERTS,
];

const DEFAULT_FORM_VALUES = {
  id: 'test-id',
  name: 'test',
  params: {},
  schedule: {
    interval: '1m',
  },
  alertDelay: {
    active: 5,
  },
  notifyWhen: null,
  consumer: 'stackAlerts',
  enabled: true,
  tags: [],
  actions: [],
  ruleTypeId: '.es-query',
};

export const RuleDefinitionSandbox = (props: RuleDefinitionSandboxProps) => {
  const { data, charts, dataViews, unifiedSearch, triggersActionsUi } = props;
  const ruleTypeId = '.es-query';

  const { docLinks, http, toasts } = useKibana<{
    docLinks: DocLinksStart;
    http: HttpStart;
    toasts: ToastsStart;
  }>().services;

  const {
    ruleTypesState: { data: ruleTypeIndex, isLoading },
  } = useLoadRuleTypesQuery({
    http,
    toasts,
  });

  const ruleTypes = useMemo(() => [...ruleTypeIndex.values()], [ruleTypeIndex]);
  const selectedRuleType = ruleTypes.find((ruleType) => ruleType.id === ruleTypeId);

  const selectedRuleTypeModel = triggersActionsUi.ruleTypeRegistry.get(ruleTypeId);

  const errors = useMemo(() => {
    if (!selectedRuleType || !selectedRuleTypeModel) {
      return null;
    }

    return getRuleErrors({
      rule: DEFAULT_FORM_VALUES as InitialRule,
      minimumScheduleInterval: {
        value: '1m',
        enforce: true,
      },
      ruleTypeModel: selectedRuleTypeModel,
    }).ruleErrors;
  }, [selectedRuleType, selectedRuleTypeModel]);

  if (isLoading || !selectedRuleType || !errors) {
    return <EuiLoadingSpinner />;
  }

  return (
    <RuleForm
      plugins={{
        data,
        charts,
        dataViews,
        unifiedSearch,
        docLinks,
      }}
      state={DEFAULT_FORM_VALUES}
      canShowConsumerSelection
      authorizedConsumers={VALID_CONSUMERS}
      errors={errors}
      selectedRuleType={selectedRuleType}
      selectedRuleTypeModel={selectedRuleTypeModel}
    />
  );
};
