/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import { ComposeDiscoverFlyout, RULE_BUILDER_REGISTRY } from '@kbn/alerting-v2-rule-form';
import type { ComposeDiscoverMode } from '@kbn/alerting-v2-rule-form';
import type { RuleApiResponse } from '../services/rules_api';
import { useCreateRule } from './use_create_rule';
import { useUpdateRule } from './use_update_rule';

const tryParseBuilderState = (type: string, query: string): unknown | null => {
  const definition = RULE_BUILDER_REGISTRY[type];
  if (definition?.parseState) {
    return definition.parseState(query);
  }
  return null;
};

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
  const [flyoutMode, setFlyoutMode] = useState<ComposeDiscoverMode>('create');
  const [targetRule, setTargetRule] = useState<RuleApiResponse | null>(null);
  const [builderType, setBuilderType] = useState<string | null>(null);
  const [initialBuilderState, setInitialBuilderState] = useState<unknown>(undefined);
  const historyKey = useMemo(() => Symbol('ruleAuthoring'), []);
  const createRuleMutation = useCreateRule();
  const updateRuleMutation = useUpdateRule();
  const ruleFormServices = useMemo(
    () => ({ http, data, dataViews, notifications, application, lens }),
    [http, data, dataViews, notifications, application, lens]
  );

  const closeFlyout = useCallback(() => {
    setFlyoutOpen(false);
    setTargetRule(null);
    setBuilderType(null);
    setInitialBuilderState(undefined);
  }, []);

  const openCreateFlyout = useCallback(() => {
    setTargetRule(null);
    setFlyoutMode('create');
    setBuilderType(null);
    setFlyoutOpen(true);
  }, []);

  const openCreateBuilderFlyout = useCallback((type: string) => {
    setTargetRule(null);
    setFlyoutMode('create');
    setBuilderType(type);
    setInitialBuilderState(undefined);
    setFlyoutOpen(true);
  }, []);

  const openEditFlyout = useCallback(
    (rule: RuleApiResponse) => {
      setTargetRule(rule);
      setFlyoutMode('edit');

      if (rule.builder_type) {
        const query = rule.evaluation?.query?.base;
        const state = query ? tryParseBuilderState(rule.builder_type, query) : null;
        if (state) {
          setBuilderType(rule.builder_type);
          setInitialBuilderState(state);
          setFlyoutOpen(true);
          return;
        }
        notifications.toasts.addInfo({
          title: 'Rule opened in ES|QL mode',
          text: 'This rule was created with a builder but its query has been modified. It can only be edited as ES|QL.',
        });
      }

      setBuilderType(null);
      setInitialBuilderState(undefined);
      setFlyoutOpen(true);
    },
    [notifications.toasts]
  );

  const openCloneFlyout = useCallback(
    (rule: RuleApiResponse) => {
      setTargetRule(rule);
      setFlyoutMode('clone');

      if (rule.builder_type) {
        const query = rule.evaluation?.query?.base;
        const state = query ? tryParseBuilderState(rule.builder_type, query) : null;
        if (state) {
          setBuilderType(rule.builder_type);
          setInitialBuilderState(state);
          setFlyoutOpen(true);
          return;
        }
        notifications.toasts.addInfo({
          title: 'Rule opened in ES|QL mode',
          text: 'This rule was created with a builder but its query has been modified. It can only be edited as ES|QL.',
        });
      }

      setBuilderType(null);
      setInitialBuilderState(undefined);
      setFlyoutOpen(true);
    },
    [notifications.toasts]
  );

  const flyout = flyoutOpen ? (
    <ComposeDiscoverFlyout
      historyKey={historyKey}
      mode={flyoutMode}
      rule={targetRule ?? undefined}
      ruleId={flyoutMode === 'edit' ? targetRule?.id : undefined}
      onClose={closeFlyout}
      services={ruleFormServices}
      builderType={builderType ?? undefined}
      initialBuilderState={initialBuilderState}
      onCreateRule={(payload) =>
        createRuleMutation.mutate(payload, {
          onSuccess: () => {
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
            onSuccess: closeFlyout,
          }
        )
      }
      isSaving={createRuleMutation.isLoading || updateRuleMutation.isLoading}
    />
  ) : null;

  return {
    flyout,
    openCreateFlyout,
    openCreateBuilderFlyout,
    openEditFlyout,
    openCloneFlyout,
  };
};
