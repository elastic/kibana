/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLoadingSpinner,
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
import { createRuleDataSchema, type CreateRuleData } from '@kbn/alerting-v2-schemas';
import { YamlRuleEditor } from '@kbn/yaml-rule-editor';
import { useFetchRule } from '../../hooks/use_fetch_rule';
import { useCreateRule } from '../../hooks/use_create_rule';
import { useUpdateRule } from '../../hooks/use_update_rule';

const DEFAULT_RULE_YAML = `kind: alert

metadata:
  name: Example rule

time_field: "@timestamp"

schedule:
  every: 1m
  lookback: 5m

evaluation:
  query:
    base: |
      FROM logs-*
      | LIMIT 1
    condition: "WHERE true"`;

const DEFAULT_RULE_VALUES: CreateRuleData = {
  kind: 'alert',
  metadata: {
    name: 'Example rule',
  },
  time_field: '@timestamp',
  schedule: { every: '1m', lookback: '5m' },
  evaluation: {
    query: {
      base: 'FROM logs-*\n| LIMIT 1',
      condition: 'WHERE true',
    },
  },
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

export const RuleFormPage = () => {
  const { id: ruleId } = useParams<{ id?: string }>();
  const isEditing = Boolean(ruleId);

  if (isEditing && ruleId) {
    return <EditRuleFormPageContent ruleId={ruleId} />;
  }

  return <RuleFormPageContent />;
};

const EditRuleFormPageContent: React.FC<{ ruleId: string }> = ({ ruleId }) => {
  const { data: rule, isLoading, isError, error } = useFetchRule(ruleId);

  if (isLoading) {
    return <EuiLoadingSpinner size="xl" />;
  }

  if (isError) {
    return (
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.alertingV2.ruleFormPage.loadErrorTitle"
            defaultMessage="Failed to load rule"
          />
        }
        color="danger"
        iconType="error"
        announceOnMount
      >
        {error instanceof Error ? error.message : String(error)}
      </EuiCallOut>
    );
  }

  if (!rule) {
    return null;
  }

  const rulePayload: CreateRuleData = {
    kind: rule.kind ?? DEFAULT_RULE_VALUES.kind,
    metadata: {
      name: rule.metadata?.name ?? DEFAULT_RULE_VALUES.metadata.name,
      owner: rule.metadata?.owner,
      labels: rule.metadata?.labels,
    },
    time_field: rule.time_field ?? DEFAULT_RULE_VALUES.time_field,
    schedule: {
      every: rule.schedule?.every ?? DEFAULT_RULE_VALUES.schedule.every,
      lookback: rule.schedule?.lookback ?? DEFAULT_RULE_VALUES.schedule.lookback,
    },
    evaluation: {
      query: {
        base: rule.evaluation?.query?.base ?? DEFAULT_RULE_VALUES.evaluation.query.base,
        ...(rule.evaluation?.query?.condition != null
          ? { condition: rule.evaluation.query.condition }
          : {}),
      },
    },
    recovery_policy: rule.recovery_policy,
    state_transition: rule.state_transition,
    grouping: rule.grouping,
    no_data: rule.no_data,
    notification_policies: rule.notification_policies,
  };

  const initialYaml = dump(rulePayload, { lineWidth: 120, noRefs: true });

  return <RuleFormPageContent ruleId={ruleId} initialYaml={initialYaml} />;
};

interface RuleFormPageContentProps {
  ruleId?: string;
  initialYaml?: string;
}

const RuleFormPageContent: React.FC<RuleFormPageContentProps> = ({ ruleId, initialYaml }) => {
  const isEditing = Boolean(ruleId);
  const history = useHistory();
  const http = useService(CoreStart('http'));
  const application = useService(CoreStart('application'));
  const data = useService(PluginStart('data')) as DataPublicPluginStart;

  const createRuleMutation = useCreateRule();
  const updateRuleMutation = useUpdateRule();

  const [yaml, setYaml] = useState(initialYaml ?? DEFAULT_RULE_YAML);
  const [validationError, setValidationError] = useState<React.ReactNode | null>(null);
  const [validationErrorTitle, setValidationErrorTitle] = useState<React.ReactNode | null>(null);

  const parsedDoc = useMemo(() => parseYaml(yaml), [yaml]);
  const isSubmitting = createRuleMutation.isLoading || updateRuleMutation.isLoading;

  const esqlCallbacks = useMemo<ESQLCallbacks>(
    () => ({
      getSources: async () => getESQLSources({ application, http }, undefined),
      getColumnsFor: async ({ query }: { query?: string } | undefined = {}) =>
        getEsqlColumns({ esqlQuery: query, search: data.search.search }),
    }),
    [application, http, data.search.search]
  );

  const onSave = async () => {
    setValidationError(null);
    setValidationErrorTitle(null);

    if (!parsedDoc) {
      setValidationErrorTitle(
        <FormattedMessage
          id="xpack.alertingV2.createRule.invalidYamlTitle"
          defaultMessage="Invalid YAML"
        />
      );
      setValidationError(
        <FormattedMessage
          id="xpack.alertingV2.createRule.invalidYaml"
          defaultMessage="YAML must define an object with rule fields."
        />
      );
      return;
    }

    const validated = createRuleDataSchema.safeParse(parsedDoc);
    if (!validated.success) {
      setValidationErrorTitle(
        <FormattedMessage
          id="xpack.alertingV2.createRule.validationTitle"
          defaultMessage="Rule validation failed"
        />
      );
      setValidationError(validated.error.message);
      return;
    }

    if (isEditing && ruleId) {
      updateRuleMutation.mutate(
        { id: ruleId, payload: validated.data },
        { onSuccess: () => history.push('/') }
      );
    } else {
      createRuleMutation.mutate(validated.data, {
        onSuccess: () => history.push('/'),
      });
    }
  };

  const mutationError = createRuleMutation.error ?? updateRuleMutation.error;
  const displayError = validationError ?? (mutationError ? getErrorMessage(mutationError) : null);
  const displayErrorTitle = validationErrorTitle ?? (
    <FormattedMessage
      id="xpack.alertingV2.createRule.saveErrorTitle"
      defaultMessage="Failed to save rule"
    />
  );

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
        {displayError ? (
          <>
            <EuiCallOut title={displayErrorTitle} color="danger" iconType="error" announceOnMount>
              {displayError}
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
            isReadOnly={isSubmitting}
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
