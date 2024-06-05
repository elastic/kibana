/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { EuiLoadingSpinner, EuiCodeBlock, EuiTitle, EuiButton } from '@elastic/eui';
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
import { RuleDefinition, getRuleErrors, InitialRule } from '@kbn/alerts-ui-shared/src/rule_form';
import { useLoadRuleTypesQuery } from '@kbn/alerts-ui-shared/src/common/hooks';

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

const DEFAULT_FORM_VALUES = (ruleTypeId: string) => ({
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
  ruleTypeId,
});

export const RuleDefinitionSandbox = (props: RuleDefinitionSandboxProps) => {
  const { data, charts, dataViews, unifiedSearch, triggersActionsUi } = props;

  const [ruleTypeId, setRuleTypeId] = useState<string>('.es-query');

  const [formValue, setFormValue] = useState<InitialRule>(DEFAULT_FORM_VALUES(ruleTypeId));

  const onChange = useCallback(
    (property: string, value: unknown) => {
      if (property === 'interval') {
        setFormValue({
          ...formValue,
          schedule: {
            interval: value as string,
          },
        });
        return;
      }
      if (property === 'params') {
        setFormValue({
          ...formValue,
          params: value as Record<string, unknown>,
        });
        return;
      }
      setFormValue({
        ...formValue,
        [property]: value,
      });
    },
    [formValue]
  );

  const onRuleTypeChange = useCallback((newRuleTypeId: string) => {
    setRuleTypeId(newRuleTypeId);
    setFormValue(DEFAULT_FORM_VALUES(newRuleTypeId));
  }, []);

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
      return {};
    }

    return getRuleErrors({
      rule: formValue,
      minimumScheduleInterval: {
        value: '1m',
        enforce: true,
      },
      ruleTypeModel: selectedRuleTypeModel,
    }).ruleErrors;
  }, [formValue, selectedRuleType, selectedRuleTypeModel]);

  if (isLoading || !selectedRuleType) {
    return <EuiLoadingSpinner />;
  }

  return (
    <>
      <div>
        <EuiTitle>
          <h1>Form State</h1>
        </EuiTitle>
        <EuiCodeBlock>{JSON.stringify(formValue, null, 2)}</EuiCodeBlock>
      </div>
      <div>
        <EuiTitle>
          <h1>Switch Rule Types:</h1>
        </EuiTitle>
        <EuiButton onClick={() => onRuleTypeChange('.es-query')}>Es Query</EuiButton>
        <EuiButton onClick={() => onRuleTypeChange('metrics.alert.threshold')}>
          Metric Threshold
        </EuiButton>
        <EuiButton onClick={() => onRuleTypeChange('observability.rules.custom_threshold')}>
          Custom Threshold
        </EuiButton>
      </div>
      <RuleDefinition
        requiredPlugins={{
          data,
          charts,
          dataViews,
          unifiedSearch,
          docLinks,
        }}
        formValues={formValue}
        canShowConsumerSelection
        authorizedConsumers={VALID_CONSUMERS}
        errors={errors}
        selectedRuleType={selectedRuleType}
        selectedRuleTypeModel={selectedRuleTypeModel}
        onChange={onChange}
      />
    </>
  );
};
