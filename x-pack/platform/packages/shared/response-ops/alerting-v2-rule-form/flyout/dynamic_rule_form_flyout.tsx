/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { HttpStart, NotificationsStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { RuleFormFlyout, RULE_FORM_ID } from './rule_form_flyout';
import { DynamicRuleForm } from '../form/dynamic_rule_form';
import { useCreateRule } from '../form/hooks/use_create_rule';
import type { FormValues } from '../form/types';

export interface DynamicRuleFormFlyoutProps {
  /** Whether to use push flyout or overlay */
  push?: boolean;
  /** Callback when flyout is closed */
  onClose?: () => void;
  /** The query that drives form values - changes will sync to form state */
  query: string;
  /** Whether the query has validation errors from the parent (e.g., Discover) */
  isQueryInvalid?: boolean;
  /** Required services */
  services: {
    http: HttpStart;
    data: DataPublicPluginStart;
    dataViews: DataViewsPublicPluginStart;
    notifications: NotificationsStart;
  };
}

/**
 * Pre-composed flyout with DynamicRuleForm.
 *
 * Use this for Discover integration where the form needs to react to external
 * query changes while preserving user-modified fields.
 *
 * The time field is automatically derived from the query's available date fields.
 */
const DynamicRuleFormFlyoutInner: React.FC<DynamicRuleFormFlyoutProps> = ({
  push,
  onClose,
  query,
  isQueryInvalid,
  services,
}) => {
  const { http, notifications, data, dataViews } = services;

  const { createRule, isLoading } = useCreateRule({
    http,
    notifications,
    onSuccess: onClose ?? (() => {}),
  });

  const handleSubmit = (values: FormValues) => {
    createRule(values);
  };

  return (
    <RuleFormFlyout push={push} onClose={onClose} isLoading={isLoading}>
      <DynamicRuleForm
        formId={RULE_FORM_ID}
        onSubmit={handleSubmit}
        query={query}
        isQueryInvalid={isQueryInvalid}
        services={{ http, data, dataViews }}
      />
    </RuleFormFlyout>
  );
};

export const DynamicRuleFormFlyout: React.FC<DynamicRuleFormFlyoutProps> = (props) => {
  const queryClient = useMemo(() => new QueryClient(), []);
  return (
    <QueryClientProvider client={queryClient}>
      <DynamicRuleFormFlyoutInner {...props} />
    </QueryClientProvider>
  );
};
