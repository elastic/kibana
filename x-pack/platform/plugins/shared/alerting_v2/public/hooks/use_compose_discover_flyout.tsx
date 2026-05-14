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
import { ComposeDiscoverFlyout } from '@kbn/alerting-v2-rule-form';
import type { RuleApiResponse } from '../services/rules_api';
import { useCreateRule } from './use_create_rule';
import { useUpdateRule } from './use_update_rule';

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
  const historyKey = useMemo(() => Symbol('ruleAuthoring'), []);
  const createRuleMutation = useCreateRule();
  const updateRuleMutation = useUpdateRule();
  const ruleFormServices = useMemo(
    () => ({ http, data, dataViews, notifications, application, lens }),
    [http, data, dataViews, notifications, application, lens]
  );

  const closeFlyout = useCallback(() => {
    setFlyoutOpen(false);
    setEditRule(null);
  }, []);

  const openCreateFlyout = useCallback(() => {
    setEditRule(null);
    setFlyoutOpen(true);
  }, []);

  const openEditFlyout = useCallback((rule: RuleApiResponse) => {
    setEditRule(rule);
    setFlyoutOpen(true);
  }, []);

  const flyout = flyoutOpen ? (
    <ComposeDiscoverFlyout
      historyKey={historyKey}
      mode={editRule ? 'edit' : 'create'}
      rule={editRule ?? undefined}
      ruleId={editRule?.id}
      onClose={closeFlyout}
      services={ruleFormServices}
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
    openEditFlyout,
  };
};
