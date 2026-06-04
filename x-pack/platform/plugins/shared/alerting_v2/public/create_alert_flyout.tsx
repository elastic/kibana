/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import useAsync from 'react-use/lib/useAsync';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { CreateRuleData, RuleResponse } from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_RULE_API_PATH } from '@kbn/alerting-v2-constants';
import { AGENT_BUILDER_APP_ID } from '@kbn/deeplinks-agent-builder';
import type {
  ComposeDiscoverFlyoutProps,
  DynamicRuleFormFlyoutProps,
} from '@kbn/alerting-v2-rule-form';
import {
  untilPluginStartServicesReady,
  type AlertingV2KibanaServices,
} from './kibana_services';
import { RuleCreateOptionsFlyout } from './components/rule_create_options/rule_create_options_flyout';
import {
  CREATE_WITH_AGENT_INITIAL_PROMPT,
  AGENT_BUILDER_NEW_CONVERSATION_PATH,
} from './constants';

export interface CreateAlertFlyoutLegacyItem {
  id: string;
  label: string;
  render: (onClose: () => void) => React.ReactElement | null;
  'data-test-subj'?: string;
}

export interface CreateAlertFlyoutProps {
  onClose: () => void;
  initialQuery?: string;
  esqlVariables?: ESQLControlVariable[];
  legacyRuleTypes?: CreateAlertFlyoutLegacyItem[];
}

type Step = 'selector' | 'esql' | 'threshold' | { legacy: string };

interface LoadedModules {
  services: AlertingV2KibanaServices;
  DynamicRuleFormFlyout: React.ComponentType<DynamicRuleFormFlyoutProps>;
  ComposeDiscoverFlyout: React.ComponentType<ComposeDiscoverFlyoutProps>;
}

const CreateAlertFlyoutInner = ({
  onClose,
  initialQuery,
  esqlVariables,
  legacyRuleTypes,
}: CreateAlertFlyoutProps) => {
  const [step, setStep] = useState<Step>('selector');
  const [isSaving, setIsSaving] = useState(false);

  const { loading, value } = useAsync(async (): Promise<LoadedModules> => {
    const [services, mod] = await Promise.all([
      untilPluginStartServicesReady(),
      import('@kbn/alerting-v2-rule-form'),
    ]);
    return {
      services,
      DynamicRuleFormFlyout: mod.DynamicRuleFormFlyout,
      ComposeDiscoverFlyout: mod.ComposeDiscoverFlyout,
    };
  }, []);

  const navigateToAgentBuilder = useCallback(() => {
    if (!value?.services) return;
    value.services.application.navigateToApp(AGENT_BUILDER_APP_ID, {
      path: AGENT_BUILDER_NEW_CONVERSATION_PATH,
      state: { initialMessage: CREATE_WITH_AGENT_INITIAL_PROMPT },
    });
    onClose();
  }, [value, onClose]);

  const historyKey = useMemo(() => Symbol('discoverCreateAlert'), []);

  const handleCreateRule = useCallback(
    async (payload: CreateRuleData) => {
      if (!value?.services) return;
      const { http, notifications } = value.services;
      setIsSaving(true);
      try {
        const rule = await http.post<RuleResponse>(ALERTING_V2_RULE_API_PATH, {
          body: JSON.stringify(payload),
        });
        notifications.toasts.addSuccess(
          i18n.translate('xpack.alertingV2.createAlertFlyout.createSuccess', {
            defaultMessage: 'Rule "{ruleName}" created successfully',
            values: { ruleName: rule.metadata.name },
          })
        );
        onClose();
      } catch (err) {
        notifications.toasts.addDanger(
          i18n.translate('xpack.alertingV2.createAlertFlyout.createError', {
            defaultMessage: 'Failed to create rule',
          })
        );
      } finally {
        setIsSaving(false);
      }
    },
    [value, onClose]
  );

  const legacyPanelItems = useMemo(
    () =>
      legacyRuleTypes?.map((item) => ({
        id: item.id,
        label: item.label,
        onClick: () => setStep({ legacy: item.id }),
        'data-test-subj': item['data-test-subj'],
      })),
    [legacyRuleTypes]
  );

  if (loading || !value) {
    return <EuiLoadingSpinner size="l" />;
  }

  const { services, DynamicRuleFormFlyout, ComposeDiscoverFlyout } = value;

  if (step === 'esql') {
    return (
      <DynamicRuleFormFlyout
        query={initialQuery ?? ''}
        onClose={onClose}
        services={services}
        esqlVariables={esqlVariables}
      />
    );
  }

  if (step === 'threshold') {
    return (
      <ComposeDiscoverFlyout
        historyKey={historyKey}
        mode="create"
        onClose={onClose}
        services={services}
        builderType="threshold"
        onCreateRule={handleCreateRule}
        isSaving={isSaving}
      />
    );
  }

  if (typeof step === 'object' && step.legacy) {
    const legacyItem = legacyRuleTypes?.find((item) => item.id === step.legacy);
    if (legacyItem) {
      return legacyItem.render(onClose);
    }
  }

  return (
    <RuleCreateOptionsFlyout
      onClose={onClose}
      onCreateEsqlRule={() => setStep('esql')}
      onCreateWithAgent={navigateToAgentBuilder}
      onCreateThresholdAlert={() => setStep('threshold')}
      legacyRuleTypes={legacyPanelItems}
    />
  );
};

export const CreateAlertFlyout = (props: CreateAlertFlyoutProps) => {
  const queryClient = useMemo(() => new QueryClient(), []);
  return (
    <QueryClientProvider client={queryClient}>
      <CreateAlertFlyoutInner {...props} />
    </QueryClientProvider>
  );
};
