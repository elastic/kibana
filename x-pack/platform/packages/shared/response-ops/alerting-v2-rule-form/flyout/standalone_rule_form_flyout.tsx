/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { RuleFormFlyout } from './rule_form_flyout';
import { StandaloneRuleForm } from '../form/standalone_rule_form';
import { useCreateRule } from '../form/hooks/use_create_rule';
import type { FormValues } from '../form/types';
import type { RuleFormServices } from '../form/contexts';

export interface StandaloneRuleFormFlyoutProps {
  /** Whether to use push flyout or overlay */
  push?: boolean;
  /** Callback when flyout is closed */
  onClose?: () => void;
  /** Initial query for the rule (only used on mount) */
  query: string;
  /** Required services */
  services: RuleFormServices;
}

/**
 * Pre-composed flyout with StandaloneRuleForm.
 *
 * Use this for a classic flyout experience where the user controls everything
 * from the form after initial mount. External prop changes are ignored.
 *
 * The flyout manages its own submission via useCreateRule so it can control
 * the loading state of its footer buttons. Time field is auto-selected by
 * TimeFieldSelect based on available date fields.
 */
const StandaloneRuleFormFlyoutInner = ({
  push,
  onClose,
  query,
  services,
}: StandaloneRuleFormFlyoutProps) => {
  const { createRule, isLoading } = useCreateRule({
    http: services.http,
    notifications: services.notifications,
  });

  const handleSubmit = (values: FormValues) => {
    createRule(values, { onSuccess: onClose });
  };

  return (
    <RuleFormFlyout push={push} onClose={onClose} isLoading={isLoading}>
      <StandaloneRuleForm
        onSubmit={handleSubmit}
        isSubmitting={isLoading}
        query={query}
        services={services}
        layout="flyout"
      />
    </RuleFormFlyout>
  );
};

export const StandaloneRuleFormFlyout = (props: StandaloneRuleFormFlyoutProps) => {
  const queryClient = useMemo(() => new QueryClient(), []);
  return (
    <QueryClientProvider client={queryClient}>
      <StandaloneRuleFormFlyoutInner {...props} />
    </QueryClientProvider>
  );
};
