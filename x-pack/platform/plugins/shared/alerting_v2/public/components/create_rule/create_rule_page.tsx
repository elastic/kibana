/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiForm, EuiPageHeader, EuiSpacer, EuiTabbedContent } from '@elastic/eui';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { ESQLCallbacks } from '@kbn/esql-types';
import { getESQLSources, getEsqlColumns } from '@kbn/esql-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import { dump, load } from 'js-yaml';
import { useHistory, useParams } from 'react-router-dom';
import { createRuleDataSchema, type CreateRuleData } from '@kbn/alerting-v2-schemas';
import type { FormValues } from '@kbn/alerting-v2-rule-form/form/types';
import { RulesApi } from '../../services/rules_api';
import { YamlTab } from './yaml_tab';
import { FormTab } from './form_tab';

const DEFAULT_RULE_YAML = `name: Example rule
tags: []
schedule:
  custom: 1m
enabled: true
query: FROM logs-* | LIMIT 1
timeField: "@timestamp"
lookbackWindow: 5m
groupingKey: []`;

const DEFAULT_RULE_VALUES: CreateRuleData = {
  name: 'Example rule',
  tags: [],
  schedule: { custom: '1m' },
  enabled: true,
  query: 'FROM logs-* | LIMIT 1',
  timeField: '@timestamp',
  lookbackWindow: '5m',
  groupingKey: [],
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

const parseYaml = (value: string): Record<string, unknown> | null => {
  try {
    const result = load(value);
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
      return null;
    }
    return result as Record<string, unknown>;
  } catch {
    return null;
  }
};

export const CreateRulePage = () => {
  const { id: ruleId } = useParams<{ id?: string }>();
  const isEditing = Boolean(ruleId);
  const history = useHistory();
  const rulesApi = useService(RulesApi);
  const http = useService(CoreStart('http'));
  const application = useService(CoreStart('application'));
  const notifications = useService(CoreStart('notifications'));
  const data = useService(PluginStart('data')) as DataPublicPluginStart;
  const dataViews = useService(PluginStart('dataViews')) as DataViewsPublicPluginStart;

  const [stagedRule, setStagedRule] = useState<Partial<CreateRuleData>>(DEFAULT_RULE_VALUES);
  const [yaml, setYaml] = useState(DEFAULT_RULE_YAML);
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [errorTitle, setErrorTitle] = useState<React.ReactNode | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRule, setIsLoadingRule] = useState(false);
  const [selectedTabId, setSelectedTabId] = useState<'yaml' | 'form'>('yaml');

  // Store a ref to get current form values
  const getFormValuesRef = React.useRef<(() => FormValues) | null>(null);

  const syncYamlToStaged = useCallback(():
    | { success: true; data: CreateRuleData }
    | { success: false } => {
    const parsed = parseYaml(yaml);
    if (!parsed) {
      return { success: false };
    }

    const validated = createRuleDataSchema.safeParse(parsed);
    if (validated.success) {
      setStagedRule(validated.data);
      setError(null);
      setErrorTitle(null);
      return { success: true, data: validated.data };
    } else {
      setErrorTitle(
        <FormattedMessage
          id="xpack.alertingV2.createRule.validationTitle"
          defaultMessage="Rule validation failed"
        />
      );
      setError(validated.error.message);
      return { success: false };
    }
  }, [yaml]);

  const syncFormToStaged = useCallback(
    (formValues: FormValues): { success: true; data: CreateRuleData } | { success: false } => {
      const validated = createRuleDataSchema.safeParse(formValues);
      if (validated.success) {
        setStagedRule(validated.data);
        setError(null);
        setErrorTitle(null);
        return { success: true, data: validated.data };
      } else {
        setErrorTitle(
          <FormattedMessage
            id="xpack.alertingV2.createRule.validationTitle"
            defaultMessage="Rule validation failed"
          />
        );
        setError(validated.error.message);
        return { success: false };
      }
    },
    []
  );

  const onSave = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);
    setErrorTitle(null);

    try {
      // Sync current tab before saving and get validated data
      let dataToSave = stagedRule;

      if (selectedTabId === 'yaml') {
        const result = syncYamlToStaged();
        if (!result.success) {
          setIsSubmitting(false);
          return;
        }
        dataToSave = result.data;
      } else if (selectedTabId === 'form' && getFormValuesRef.current) {
        const formValues = getFormValuesRef.current();
        const result = syncFormToStaged(formValues);
        if (!result.success) {
          setIsSubmitting(false);
          return;
        }
        dataToSave = result.data;
      }

      // Final validation of the data to save
      const validated = createRuleDataSchema.safeParse(dataToSave);
      if (!validated.success) {
        setErrorTitle(
          <FormattedMessage
            id="xpack.alertingV2.createRule.validationTitle"
            defaultMessage="Rule validation failed"
          />
        );
        setError(validated.error.message);
        setIsSubmitting(false);
        return;
      }

      if (isEditing && ruleId) {
        await rulesApi.updateRule(ruleId, validated.data);
      } else {
        await rulesApi.createRule(validated.data);
      }

      history.push('/');
    } catch (err) {
      setErrorTitle(
        <FormattedMessage
          id="xpack.alertingV2.createRule.saveErrorTitle"
          defaultMessage="Failed to save rule"
        />
      );
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    selectedTabId,
    syncFormToStaged,
    syncYamlToStaged,
    stagedRule,
    isEditing,
    ruleId,
    rulesApi,
    history,
  ]);

  const esqlCallbacks = useMemo<ESQLCallbacks>(
    () => ({
      getSources: async () => getESQLSources({ application, http }, undefined),
      getColumnsFor: async ({ query }: { query?: string } | undefined = {}) =>
        getEsqlColumns({ esqlQuery: query, search: data.search.search }),
    }),
    [application, http, data.search.search]
  );

  const tabs = useMemo(
    () => [
      {
        id: 'yaml',
        name: (
          <FormattedMessage
            id="xpack.alertingV2.createRule.yamlTabLabel"
            defaultMessage="Use YAML"
          />
        ),
        content: (
          <YamlTab
            yaml={yaml}
            onYamlChange={setYaml}
            onYamlBlur={syncYamlToStaged}
            onSave={onSave}
            onCancel={() => history.push('/')}
            esqlCallbacks={esqlCallbacks}
            isReadOnly={isLoadingRule || isSubmitting}
            isSubmitting={isSubmitting}
            isEditing={isEditing}
            error={error}
            errorTitle={errorTitle}
          />
        ),
      },
      {
        id: 'form',
        name: (
          <FormattedMessage
            id="xpack.alertingV2.createRule.formTabLabel"
            defaultMessage="Use form"
          />
        ),
        content: (
          <FormTab
            stagedRule={stagedRule}
            onFormChange={syncFormToStaged}
            onFormReady={(getCurrentValues) => {
              getFormValuesRef.current = getCurrentValues;
            }}
            onSave={onSave}
            onCancel={() => history.push('/')}
            services={{ http, data, dataViews, notifications }}
            isReadOnly={isLoadingRule || isSubmitting}
            isSubmitting={isSubmitting}
            isEditing={isEditing}
            error={error}
            errorTitle={errorTitle}
          />
        ),
      },
    ],
    [
      yaml,
      syncYamlToStaged,
      esqlCallbacks,
      isLoadingRule,
      isSubmitting,
      isEditing,
      error,
      errorTitle,
      stagedRule,
      syncFormToStaged,
      http,
      data,
      dataViews,
      notifications,
      history,
      onSave,
    ]
  );

  useEffect(() => {
    if (!ruleId) {
      return;
    }

    let cancelled = false;
    const loadRule = async () => {
      setIsLoadingRule(true);
      setError(null);
      setErrorTitle(null);

      try {
        const rule = await rulesApi.getRule(ruleId);
        if (cancelled) {
          return;
        }

        const nextPayload: CreateRuleData = {
          ...DEFAULT_RULE_VALUES,
          name: rule.name,
          tags: rule.tags ?? DEFAULT_RULE_VALUES.tags,
          schedule: rule.schedule?.custom
            ? { custom: rule.schedule.custom }
            : DEFAULT_RULE_VALUES.schedule,
          enabled: rule.enabled ?? DEFAULT_RULE_VALUES.enabled,
          query: rule.query ?? DEFAULT_RULE_VALUES.query,
          timeField: rule.timeField ?? DEFAULT_RULE_VALUES.timeField,
          lookbackWindow: rule.lookbackWindow ?? DEFAULT_RULE_VALUES.lookbackWindow,
          groupingKey: rule.groupingKey ?? DEFAULT_RULE_VALUES.groupingKey,
        };

        setStagedRule(nextPayload);
        setYaml(dump(nextPayload, { lineWidth: 120, noRefs: true }));
      } catch (err) {
        if (!cancelled) {
          setErrorTitle(
            <FormattedMessage
              id="xpack.alertingV2.createRule.loadErrorTitle"
              defaultMessage="Failed to load rule"
            />
          );
          setError(getErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingRule(false);
        }
      }
    };

    loadRule();

    return () => {
      cancelled = true;
    };
  }, [ruleId, rulesApi]);

  return (
    <>
      <EuiPageHeader
        pageTitle={
          isEditing ? (
            <FormattedMessage
              id="xpack.alertingV2.createRule.editPageTitle"
              defaultMessage="Edit rule"
            />
          ) : (
            <FormattedMessage
              id="xpack.alertingV2.createRule.pageTitle"
              defaultMessage="Create rule"
            />
          )
        }
      />
      <EuiSpacer size="m" />
      <EuiForm component="form" fullWidth>
        <EuiTabbedContent
          tabs={tabs}
          selectedTab={tabs.find((tab) => tab.id === selectedTabId)}
          onTabClick={(tab) => {
            const newTabId = tab.id as 'yaml' | 'form';

            // Clear errors when switching tabs
            setError(null);
            setErrorTitle(null);

            // Sync current tab data before switching and get validated data
            let dataToSerialize = stagedRule;

            if (selectedTabId === 'yaml') {
              const result = syncYamlToStaged();
              if (result.success) {
                dataToSerialize = result.data;
              }
            } else if (selectedTabId === 'form' && getFormValuesRef.current) {
              // Sync form values when leaving form tab
              const formValues = getFormValuesRef.current();
              const result = syncFormToStaged(formValues);
              if (result.success) {
                dataToSerialize = result.data;
              }
            }

            // Load new tab with validated data
            if (newTabId === 'yaml') {
              setYaml(dump(dataToSerialize, { lineWidth: 120, noRefs: true }));
            }

            setSelectedTabId(newTabId);
          }}
        />
      </EuiForm>
    </>
  );
};
