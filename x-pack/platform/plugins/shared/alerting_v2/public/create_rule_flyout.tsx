/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { EuiErrorBoundary, EuiFlyout, EuiFlyoutBody, EuiLoadingSpinner } from '@elastic/eui';
import useAsync from 'react-use/lib/useAsync';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
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
}

const CreateRuleFlyoutInner = ({ onClose, onRuleCreated, flyoutType }: CreateRuleFlyoutProps) => {
  const { loading, value } = useAsync(loadComposeDiscoverModules, []);
  const historyKey = useMemo(() => Symbol('createRule'), []);
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
        onClose={onClose}
        onHistoryBack={onClose}
        closeRequestRef={closeRequestRef}
        onCreateRule={createRule}
        isSaving={isSaving}
        flyoutType={flyoutType}
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
