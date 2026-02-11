/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { EuiCallOut, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ESQLCallbacks } from '@kbn/esql-types';
import { PluginStart } from '@kbn/core-di';
import { useService, CoreStart } from '@kbn/core-di-browser';
import type { HttpStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { getESQLSources, getEsqlColumns } from '@kbn/esql-utils';
import { YamlRuleEditor } from '@kbn/yaml-rule-editor';
import { dump, load } from 'js-yaml';
import { createRuleDataSchema, type CreateRuleData } from '@kbn/alerting-v2-schemas';
import type { RulesApi } from '../../services/rules_api';
import { RuleFooter } from './rule_footer';

const DEFAULT_RULE_YAML = `name: Example rule
kind: alert
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
  kind: 'alert',
  tags: [],
  schedule: { custom: '1m' },
  enabled: true,
  query: 'FROM logs-* | LIMIT 1',
  timeField: '@timestamp',
  lookbackWindow: '5m',
  groupingKey: [],
};

interface YamlTabProps {
  ruleId?: string;
  isEditing: boolean;
  onCancel: () => void;
  services: {
    http: HttpStart;
    rulesApi: RulesApi;
  };
  saveRule: (formValues: any) => Promise<void>;
  isSubmitting: boolean;
  setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
}

const getErrorMessage = (error: unknown): string => {
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

export const YamlTab: React.FC<YamlTabProps> = ({
  ruleId,
  isEditing,
  onCancel,
  saveRule,
  isSubmitting,
  setIsSubmitting,
  services,
}) => {
  const http = useService(CoreStart('http'));
  const application = useService(CoreStart('application'));
  const data = useService(PluginStart('data')) as DataPublicPluginStart;

  const [yaml, setYaml] = useState(DEFAULT_RULE_YAML);
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [errorTitle, setErrorTitle] = useState<React.ReactNode | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const esqlCallbacks = useMemo<ESQLCallbacks>(
    () => ({
      getSources: async () => getESQLSources({ application, http }, undefined),
      getColumnsFor: async ({ query }: { query?: string } | undefined = {}) =>
        getEsqlColumns({ esqlQuery: query, search: data.search.search }),
    }),
    [application, http, data.search.search]
  );

  // Load rule data when in edit mode
  useEffect(() => {
    if (!ruleId) {
      setYaml(DEFAULT_RULE_YAML);
      return;
    }

    let cancelled = false;
    const loadRule = async () => {
      setIsLoading(true);
      setError(null);
      setErrorTitle(null);

      try {
        const rule = await services.rulesApi.getRule(ruleId);
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
          setIsLoading(false);
        }
      }
    };

    loadRule();

    return () => {
      cancelled = true;
    };
  }, [ruleId, services.rulesApi]);

  const handleSave = async () => {
    setIsSubmitting(true);
    setError(null);
    setErrorTitle(null);

    try {
      // Parse YAML
      const parsed = parseYaml(yaml);
      if (!parsed) {
        setErrorTitle(
          <FormattedMessage
            id="xpack.alertingV2.createRule.yamlParseErrorTitle"
            defaultMessage="Invalid YAML"
          />
        );
        setError(
          <FormattedMessage
            id="xpack.alertingV2.createRule.yamlParseError"
            defaultMessage="The YAML could not be parsed. Please check your syntax."
          />
        );
        setIsSubmitting(false);
        return;
      }

      // Validate rule data
      const validated = createRuleDataSchema.safeParse(parsed);
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

      await saveRule(validated.data);
    } catch (err) {
      setErrorTitle(
        <FormattedMessage
          id="xpack.alertingV2.createRule.saveErrorTitle"
          defaultMessage="Failed to save rule"
        />
      );
      setError(getErrorMessage(err));
      setIsSubmitting(false);
    }
  };

  const isReadOnly = isLoading || isSubmitting;

  return (
    <>
      <EuiSpacer size="m" />
      {error ? (
        <>
          <EuiCallOut
            title={
              errorTitle ?? (
                <FormattedMessage
                  id="xpack.alertingV2.createRule.errorTitle"
                  defaultMessage="Failed to create rule"
                />
              )
            }
            color="danger"
            iconType="error"
            announceOnMount
            data-test-subj="createRuleErrorCallout"
          >
            {error}
          </EuiCallOut>
          <EuiSpacer />
        </>
      ) : null}
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.alertingV2.createRule.yamlLabel"
            defaultMessage="Rule definition (YAML)"
          />
        }
        fullWidth
        helpText={
          <FormattedMessage
            id="xpack.alertingV2.createRule.yamlHelpText"
            defaultMessage="Paste the rule payload as YAML. ES|QL autocomplete is available within the query field."
          />
        }
      >
        <YamlRuleEditor
          value={yaml}
          onChange={setYaml}
          esqlCallbacks={esqlCallbacks}
          isReadOnly={isReadOnly}
          dataTestSubj="alertingV2CreateRuleYaml"
        />
      </EuiFormRow>
      <EuiSpacer />
      <RuleFooter
        onSave={handleSave}
        onCancel={onCancel}
        isSubmitting={isSubmitting}
        isEditing={isEditing}
      />
    </>
  );
};
