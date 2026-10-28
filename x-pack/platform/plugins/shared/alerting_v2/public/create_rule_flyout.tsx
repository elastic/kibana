/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { EuiErrorBoundary, EuiFlyout, EuiFlyoutBody, EuiLoadingSpinner } from '@elastic/eui';
import useAsync from 'react-use/lib/useAsync';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import type { CreateRuleData, RuleResponse } from '@kbn/alerting-v2-schemas';
import type { ComposeDiscoverFlyoutProps } from '@kbn/alerting-v2-rule-form';
import { Context } from '@kbn/core-di-browser';
import {
  ActionPolicyAwareComposeDiscoverFlyout,
  loadComposeDiscoverModules,
  useCreateRuleSubmit,
} from './compose_discover_flyout_loader';

export interface CreateRuleFlyoutProps {
  onClose: () => void;
  /** Called after the rule is saved; the flyout closes itself when omitted. */
  onRuleCreated?: (rule: RuleResponse) => void;
  /** `push` keeps the host page visible beside the form. Defaults to `overlay`. */
  flyoutType?: 'overlay' | 'push';
  /** Rule to prefill the form with (e.g. a migrated classic rule); read on mount only. */
  initialRule?: CreateRuleData;
  /** Step to open on; pass a new object to jump to a step while the flyout is open. */
  stepRequest?: ComposeDiscoverFlyoutProps['stepRequest'];
}

const toSyntheticRule = (rule: CreateRuleData): RuleResponse => {
  const now = new Date().toISOString();
  const {
    state_transition: stateTransition,
    metadata: { routing_tags: _routingTags, ...metadata },
    ...ruleData
  } = rule;
  return {
    ...ruleData,
    metadata,
    state_transition: stateTransition ?? undefined,
    id: '',
    version: 1,
    enabled: false,
    created_by: null,
    created_at: now,
    updated_by: null,
    updated_at: now,
  };
};

const CreateRuleFlyoutInner = ({
  onClose,
  onRuleCreated,
  flyoutType,
  initialRule: initialRuleData,
  stepRequest,
}: CreateRuleFlyoutProps) => {
  const { loading, value } = useAsync(loadComposeDiscoverModules, []);
  const historyKey = useMemo(() => Symbol('createRule'), []);
  const [initialRule] = useState(() =>
    initialRuleData ? toSyntheticRule(initialRuleData) : undefined
  );
  const closeRequestRef = useRef<(() => void) | null>(null);

  const handleCreated = useCallback(
    (rule: RuleResponse) => (onRuleCreated ? onRuleCreated(rule) : onClose()),
    [onRuleCreated, onClose]
  );
  const { isSaving, createRule } = useCreateRuleSubmit(value?.services, handleCreated);

  if (loading || !value) {
    return (
      <EuiFlyout
        type={flyoutType}
        size="s"
        onClose={onClose}
        aria-label={i18n.translate('xpack.alertingV2.createRuleFlyout.loadingFlyoutAriaLabel', {
          defaultMessage: 'Create rule',
        })}
        data-test-subj="createRuleFlyoutLoading"
      >
        <EuiFlyoutBody>
          <EuiLoadingSpinner size="l" />
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }

  const { services, ComposeDiscoverFlyout } = value;

  return (
    <Context.Provider value={services.container}>
      <ActionPolicyAwareComposeDiscoverFlyout
        ComposeDiscoverFlyout={ComposeDiscoverFlyout}
        services={services}
        historyKey={historyKey}
        mode="create"
        rule={initialRule}
        onClose={onClose}
        onHistoryBack={onClose}
        closeRequestRef={closeRequestRef}
        onCreateRule={createRule}
        isSaving={isSaving}
        flyoutType={flyoutType}
        stepRequest={stepRequest}
      />
    </Context.Provider>
  );
};

/** Standalone ES|QL create-rule flyout for hosts outside the alerting v2 app. */
export const CreateRuleFlyout = (props: CreateRuleFlyoutProps) => {
  const queryClient = useMemo(() => new QueryClient(), []);
  return (
    <EuiErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <CreateRuleFlyoutInner {...props} />
      </QueryClientProvider>
    </EuiErrorBoundary>
  );
};
