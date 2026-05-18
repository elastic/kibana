/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import { ComposeDiscoverFlyout, RULE_BUILDER_TYPE } from '@kbn/alerting-v2-rule-form';
import { RulesApi } from '../services/rules_api';
import type { RuleApiResponse } from '../services/rules_api';
import { useCreateRule } from './use_create_rule';
import { useUpdateRule } from './use_update_rule';
import { useFetchRuleBuilderConfig } from './use_fetch_rule_builder_config';

interface UseComposeDiscoverFlyoutOptions {
  createSuccessRedirectPath?: string;
}

export const useComposeDiscoverFlyout = ({
  createSuccessRedirectPath,
}: UseComposeDiscoverFlyoutOptions = {}) => {
  const http = useService(CoreStart('http'));
  const notifications = useService(CoreStart('notifications'));
  const application = useService(CoreStart('application'));
  const data = useService(PluginStart('data')) as DataPublicPluginStart;
  const dataViews = useService(PluginStart('dataViews')) as DataViewsPublicPluginStart;
  const lens = useService(PluginStart('lens')) as LensPublicStart;

  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [editRule, setEditRule] = useState<RuleApiResponse | null>(null);
  const [ruleBuilderMode, setRuleBuilderMode] = useState(false);
  const historyKey = useMemo(() => Symbol('ruleAuthoring'), []);
  const createRuleMutation = useCreateRule();
  const updateRuleMutation = useUpdateRule();
  const ruleFormServices = useMemo(
    () => ({ http, data, dataViews, notifications, application, lens }),
    [http, data, dataViews, notifications, application, lens]
  );

  const isRuleBuilderEdit = ruleBuilderMode && editRule?.id != null;
  const {
    data: ruleBuilderConfigData,
    isLoading: isRuleBuilderConfigLoading,
    isError: isRuleBuilderConfigError,
  } = useFetchRuleBuilderConfig(editRule?.id, isRuleBuilderEdit);

  const initialRuleBuilderState = useMemo(() => {
    if (!ruleBuilderConfigData?.config) return undefined;
    try {
      return JSON.parse(ruleBuilderConfigData.config) as Record<string, unknown>;
    } catch {
      return undefined;
    }
  }, [ruleBuilderConfigData]);

  const rulesApi = useService(RulesApi);
  const pendingBuilderStateRef = useRef<Record<string, unknown> | null>(null);

  const saveBuilderConfig = useCallback(
    async (targetRuleId: string) => {
      const builderState = pendingBuilderStateRef.current;
      if (!builderState) return;
      pendingBuilderStateRef.current = null;
      try {
        await rulesApi.saveRuleBuilderConfig(targetRuleId, {
          type: RULE_BUILDER_TYPE,
          config: JSON.stringify(builderState),
        });
      } catch {
        // Config save is best-effort — the rule itself was already saved
      }
    },
    [rulesApi]
  );

  const closeFlyout = useCallback(() => {
    setFlyoutOpen(false);
    setEditRule(null);
    setRuleBuilderMode(false);
    pendingBuilderStateRef.current = null;
  }, []);

  const openCreateFlyout = useCallback((opts?: { ruleBuilderMode?: boolean }) => {
    setEditRule(null);
    setRuleBuilderMode(opts?.ruleBuilderMode ?? false);
    setFlyoutOpen(true);
  }, []);

  const openEditFlyout = useCallback((rule: RuleApiResponse) => {
    setEditRule(rule);
    setRuleBuilderMode(rule.edit_mode === 'rule_builder');
    setFlyoutOpen(true);
  }, []);

  const shouldWaitForConfig = isRuleBuilderEdit && isRuleBuilderConfigLoading;

  const flyout =
    flyoutOpen && !shouldWaitForConfig ? (
      <ComposeDiscoverFlyout
        historyKey={historyKey}
        mode={editRule ? 'edit' : 'create'}
        rule={editRule ?? undefined}
        ruleId={editRule?.id}
        onClose={closeFlyout}
        services={ruleFormServices}
        onCreateRule={(payload) =>
          createRuleMutation.mutate(payload, {
            onSuccess: async (createdRule) => {
              if (ruleBuilderMode && createdRule?.id) {
                await saveBuilderConfig(createdRule.id);
              }
              setFlyoutOpen(false);
              if (createSuccessRedirectPath) {
                application.navigateToUrl(http.basePath.prepend(createSuccessRedirectPath));
              }
            },
          })
        }
        onUpdateRule={(id, payload) =>
          updateRuleMutation.mutate(
            { id, payload },
            {
              onSuccess: async () => {
                if (ruleBuilderMode) {
                  await saveBuilderConfig(id);
                }
                closeFlyout();
              },
            }
          )
        }
        isSaving={createRuleMutation.isLoading || updateRuleMutation.isLoading}
        ruleBuilderMode={ruleBuilderMode}
        initialRuleBuilderState={initialRuleBuilderState}
        configLoadFailed={isRuleBuilderEdit && isRuleBuilderConfigError}
        onSwitchToEsqlMode={() => setRuleBuilderMode(false)}
        onRuleBuilderConfigSave={(state) => {
          pendingBuilderStateRef.current = state;
        }}
      />
    ) : null;

  return {
    flyout,
    openCreateFlyout,
    openEditFlyout,
  };
};
