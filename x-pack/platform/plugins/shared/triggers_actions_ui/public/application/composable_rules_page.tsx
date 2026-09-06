/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { ScopedHistory } from '@kbn/core/public';
import { createMemoryHistory } from 'history';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { KibanaFeature } from '@kbn/features-plugin/common';
import { RulesPageApp } from './rules_page_app';
import type { TriggersAndActionsUiServices } from './rules_app';
import type { ClassicRulesPageInternalDeps, ClassicRulesPageProps } from './classic_rules_page';

export type { ClassicRulesPageInternalDeps, ClassicRulesPageProps } from './classic_rules_page';

export const ComposableClassicRulesPage = ({
  coreStart,
  setBreadcrumbs,
  history,
  internalDeps,
}: ClassicRulesPageProps & { internalDeps: ClassicRulesPageInternalDeps }) => {
  const { pluginsStart } = internalDeps;
  const [kibanaFeatures, setKibanaFeatures] = useState<KibanaFeature[]>([]);

  useEffect(() => {
    let cancelled = false;
    pluginsStart.features
      .getFeatures()
      .then((features) => {
        if (!cancelled) {
          setKibanaFeatures(features);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setKibanaFeatures([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pluginsStart.features]);

  const resolvedHistory = useMemo(
    () => history ?? (createMemoryHistory() as unknown as ScopedHistory),
    [history]
  );

  const deps: TriggersAndActionsUiServices = useMemo(
    () => ({
      ...coreStart,
      actions: internalDeps.actions,
      security: { ...coreStart.security, ...internalDeps.security },
      cloud: internalDeps.cloud,
      data: pluginsStart.data,
      dataViews: pluginsStart.dataViews,
      dataViewEditor: pluginsStart.dataViewEditor,
      charts: pluginsStart.charts,
      alerting: pluginsStart.alerting,
      spaces: pluginsStart.spaces,
      unifiedSearch: pluginsStart.unifiedSearch,
      isCloud: Boolean(internalDeps.cloud?.isCloudEnabled),
      element: document.createElement('div'),
      storage: new Storage(window.localStorage),
      setBreadcrumbs,
      history: resolvedHistory,
      actionTypeRegistry: internalDeps.actionTypeRegistry,
      ruleTypeRegistry: internalDeps.ruleTypeRegistry,
      kibanaFeatures,
      licensing: pluginsStart.licensing,
      expressions: pluginsStart.expressions,
      isServerless: internalDeps.isServerless,
      fieldFormats: pluginsStart.fieldFormats,
      lens: pluginsStart.lens,
      fieldsMetadata: pluginsStart.fieldsMetadata,
      contentManagement: pluginsStart.contentManagement,
      share: pluginsStart.share,
      uiActions: pluginsStart.uiActions,
      cps: pluginsStart.cps,
      inspector: pluginsStart.inspector,
    }),
    [coreStart, internalDeps, kibanaFeatures, pluginsStart, resolvedHistory, setBreadcrumbs]
  );

  return <RulesPageApp deps={deps} />;
};
