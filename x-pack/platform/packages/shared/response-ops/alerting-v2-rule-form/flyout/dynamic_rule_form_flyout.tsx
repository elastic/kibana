/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { RuleFormFlyout } from './rule_form_flyout';
import { DynamicRuleForm } from '../form/dynamic_rule_form';
import { useCreateRule } from '../form/hooks/use_create_rule';
import { inlineEsqlVariables } from '../utils/esql_rule_utils';
import type { FormValues } from '../form/types';
import type { RuleFormServices } from '../form/contexts';

export interface DynamicRuleFormFlyoutProps {
  /** Whether to use push flyout or overlay */
  push?: boolean;
  /** Callback when flyout is closed */
  onClose?: () => void;
  /** The query that drives form values - changes will sync to form state */
  query: string;
  /** Required services */
  services: RuleFormServices;
  /** Whether to include the Form/YAML edit mode toggle (default: false) */
  includeYaml?: boolean;
  /**
   * ES|QL control variables from Discover. When provided (including `[]`),
   * the flyout inlines resolvable `?param` / `??param` tokens via Composer
   * and blocks save for any that remain unresolved.
   *
   * When `undefined`, the flyout treats the query as-is — no placeholder
   * scanning, no save gating — so non-ES|QL-control callers are unaffected.
   */
  esqlVariables?: ESQLControlVariable[];
  /**
   * Caller-supplied validation errors (merged with any unresolved-variable
   * errors computed internally).
   */
  validationErrors?: string[];
}

/**
 * Pre-composed flyout with DynamicRuleForm.
 *
 * Use this for Discover integration where the form needs to react to external
 * query changes while preserving user-modified fields.
 *
 * The flyout manages its own submission via useCreateRule so it can control
 * the loading state of its footer buttons. The time field is automatically
 * derived from the query's available date fields.
 */
const DynamicRuleFormFlyoutInner = ({
  push,
  onClose,
  query,
  services,
  includeYaml = false,
  esqlVariables,
  validationErrors,
}: DynamicRuleFormFlyoutProps) => {
  const inlineResult = useMemo(
    () => inlineEsqlVariables(query, esqlVariables),
    [query, esqlVariables]
  );

  const allErrors = useMemo(
    () => [...inlineResult.unresolved, ...(validationErrors ?? [])],
    [inlineResult.unresolved, validationErrors]
  );

  const { createRule, isLoading } = useCreateRule({
    http: services.http,
    notifications: services.notifications,
  });

  const handleSubmit = (values: FormValues) => {
    createRule(values, { onSuccess: onClose });
  };

  const hasValidationErrors = allErrors.length > 0;

  return (
    <RuleFormFlyout
      push={push}
      onClose={onClose}
      isLoading={isLoading}
      isSaveDisabled={hasValidationErrors}
    >
      {hasValidationErrors && (
        <>
          <EuiCallOut
            announceOnMount
            color="danger"
            iconType="alert"
            data-test-subj="ruleV2FlyoutValidationErrors"
            title={i18n.translate('xpack.alertingV2.ruleForm.validationErrors.title', {
              defaultMessage: 'Resolve issues before saving',
            })}
          >
            <p>
              <FormattedMessage
                id="xpack.alertingV2.ruleForm.validationErrors.description"
                defaultMessage="The following items must be resolved before this rule can be saved: {names}"
                values={{ names: allErrors.join(', ') }}
              />
            </p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}
      <DynamicRuleForm
        onSubmit={handleSubmit}
        isSubmitting={isLoading}
        query={inlineResult.query}
        services={services}
        layout="flyout"
        includeYaml={includeYaml}
      />
    </RuleFormFlyout>
  );
};

export const DynamicRuleFormFlyout = (props: DynamicRuleFormFlyoutProps) => {
  const queryClient = useMemo(() => new QueryClient(), []);
  return (
    <QueryClientProvider client={queryClient}>
      <DynamicRuleFormFlyoutInner {...props} />
    </QueryClientProvider>
  );
};
