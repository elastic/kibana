/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPageHeader,
  EuiSpacer,
} from '@elastic/eui';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ESQLCallbacks } from '@kbn/esql-types';
import { getESQLSources, getEsqlColumns } from '@kbn/esql-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import { dump, load } from 'js-yaml';
import { useHistory, useParams } from 'react-router-dom';
import { createRuleDataSchema } from '../../common/schemas/create_rule_data_schema';
import type { CreateRuleData } from '../../common/types';
import { RulesApi } from '../services/rules_api';
import { YamlRuleEditor } from './yaml_rule_editor';

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
  const data = useService(PluginStart('data')) as DataPublicPluginStart;
  const [yaml, setYaml] = useState(DEFAULT_RULE_YAML);
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [errorTitle, setErrorTitle] = useState<React.ReactNode | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRule, setIsLoadingRule] = useState(false);

  const parsedDoc = useMemo(() => parseYaml(yaml), [yaml]);

  const esqlCallbacks = useMemo<ESQLCallbacks>(
    () => ({
      getSources: async () => getESQLSources({ application, http }, undefined),
      getColumnsFor: async ({ query }: { query?: string } | undefined = {}) =>
        getEsqlColumns({ esqlQuery: query, search: data.search.search }),
    }),
    [application, http, data.search.search]
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

  const onSave = async () => {
    setIsSubmitting(true);
    setError(null);
    setErrorTitle(null);

    try {
      if (!parsedDoc) {
        setErrorTitle(
          <FormattedMessage
            id="xpack.alertingV2.createRule.invalidYamlTitle"
            defaultMessage="Invalid YAML"
          />
        );
        setError(
          <FormattedMessage
            id="xpack.alertingV2.createRule.invalidYaml"
            defaultMessage="YAML must define an object with rule fields."
          />
        );
        setIsSubmitting(false);
        return;
      }

      const validated = createRuleDataSchema.safeParse(parsedDoc);
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
  };

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
            isReadOnly={isLoadingRule || isSubmitting}
            dataTestSubj="alertingV2CreateRuleYaml"
          />
        </EuiFormRow>
        <EuiSpacer />
        <EuiFlexGroup justifyContent="flexStart" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={onSave}
              isLoading={isSubmitting}
              fill
              data-test-subj="alertingV2CreateRuleSubmit"
            >
              {isEditing ? (
                <FormattedMessage
                  id="xpack.alertingV2.createRule.saveLabel"
                  defaultMessage="Save changes"
                />
              ) : (
                <FormattedMessage
                  id="xpack.alertingV2.createRule.submitLabel"
                  defaultMessage="Create rule"
                />
              )}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={() => history.push('/')} data-test-subj="cancelCreateRule">
              <FormattedMessage
                id="xpack.alertingV2.createRule.cancelLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>
    </>
  );
};
