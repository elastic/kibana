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
import { RuleForm, useLoadRuleTypesQuery } from '@kbn/alerts-ui-shared';

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

  if (isLoading || !selectedRuleType) {
    return <EuiLoadingSpinner />;
  }

  return (
    <RuleForm
      plugins={{
        http,
        data,
        charts,
        dataViews,
        unifiedSearch,
        docLinks,
      }}
      consumer="alerts"
      ruleType={selectedRuleType}
      ruleTypeModel={selectedRuleTypeModel}
      onCancel={() => {}}
    />
  );
};
