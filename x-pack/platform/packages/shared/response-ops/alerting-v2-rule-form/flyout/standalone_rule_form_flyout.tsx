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
import { StandaloneRuleForm } from '../form/standalone_rule_form';
import { useCreateRule } from '../form/hooks/use_create_rule';
import type { FormValues } from '../form/types';

export interface StandaloneRuleFormFlyoutProps {
  /** Whether to use push flyout or overlay */
  push?: boolean;
  /** Callback when flyout is closed */
  onClose?: () => void;
  /** Initial query for the rule (only used on mount) */
  query: string;
  /** Required services */
  services: {
    http: HttpStart;
    data: DataPublicPluginStart;
    dataViews: DataViewsPublicPluginStart;
    notifications: NotificationsStart;
  };
}

/**
 * Pre-composed flyout with StandaloneRuleForm.
 *
 * Use this for a classic flyout experience where the user controls everything
 * from the form after initial mount. External prop changes are ignored.
 *
 * Time field is auto-selected by TimeFieldSelect based on available date fields.
 */
const StandaloneRuleFormFlyoutInner: React.FC<StandaloneRuleFormFlyoutProps> = ({
  push,
  onClose,
  query,
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
      <StandaloneRuleForm
        formId={RULE_FORM_ID}
        onSubmit={handleSubmit}
        query={query}
        services={{ http, data, dataViews }}
      />
    </RuleFormFlyout>
  );
};

export const StandaloneRuleFormFlyout: React.FC<StandaloneRuleFormFlyoutProps> = (props) => {
  const queryClient = useMemo(() => new QueryClient(), []);
  return (
    <QueryClientProvider client={queryClient}>
      <StandaloneRuleFormFlyoutInner {...props} />
    </QueryClientProvider>
  );
};
