/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiEmptyPrompt, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { Filter } from '@kbn/es-query';
import type { DashboardApi, DashboardCreationOptions } from '@kbn/dashboard-plugin/public';
import { DashboardRenderer } from '@kbn/dashboard-plugin/public';
import { useKibana } from '../../../hooks/use_kibana';

type DashboardWidgets = NonNullable<
  ReturnType<DashboardApi['getSerializedState']>['attributes']['panels']
>;

/**
 * Describes how to embed one of the Fleet-installed OpenTelemetry Kubernetes
 * detail dashboards for an entity kind:
 * - `dashboardTitle` is resolved to a saved-object id at runtime (the id is
 *   package/version-specific), so a missing package degrades gracefully.
 * - `scopeField` is the OTel dimension applied as a dashboard-level phrase
 *   filter so every panel narrows to the clicked resource.
 * - `hiddenPanelIds` are the stock panels that make no sense embedded in the
 *   flyout (the "< Overview" back link, "View logs/traces" cards, and the top
 *   header row) — pruned from the loaded state. Ids are the panel indices
 *   baked into the Fleet-managed saved objects.
 */
export interface K8sDetailDashboardConfig {
  readonly dashboardTitle: string;
  readonly scopeField: string;
  readonly hiddenPanelIds: ReadonlySet<string>;
}

/**
 * Per-kind dashboard wiring. Keyed by the canonical entity kind resolved by
 * the flyout (`entityTypeToKind`). Only Kubernetes kinds with a matching OTel
 * detail dashboard are present; everything else falls through to no embed.
 */
export const K8S_DETAIL_DASHBOARDS: Readonly<Record<string, K8sDetailDashboardConfig>> = {
  pod: {
    dashboardTitle: '[Kubernetes OTel] Pod Detail',
    scopeField: 'k8s.pod.name',
    hiddenPanelIds: new Set([
      'v3-pod-back-link',
      'v3-pd-header-name',
      'v3-pd-header-status',
      'v2-pod-detail-restarts',
      'v4-pd-logs-card',
      '6fa51571-a6e1-468f-8c5c-71750a609f79',
    ]),
  },
  node: {
    dashboardTitle: '[Kubernetes OTel] Node Detail',
    scopeField: 'k8s.node.name',
    hiddenPanelIds: new Set([
      'v3-node-back-link',
      'v3-nd-header-name',
      'v3-nd-header-status',
      'v4-nd-logs-card',
    ]),
  },
  namespace: {
    dashboardTitle: '[Kubernetes OTel] Namespace Detail',
    scopeField: 'k8s.namespace.name',
    hiddenPanelIds: new Set([
      'v3-namespace-back-link',
      'v3-nsd-name',
      'v3-nsd-status',
      'v4-nsd-logs-card',
    ]),
  },
  cluster: {
    dashboardTitle: '[Kubernetes OTel] Cluster Detail',
    scopeField: 'k8s.cluster.name',
    hiddenPanelIds: new Set(['v3-cluster-back-link', 'v3-cd-header-name', 'v4-cd-logs-card']),
  },
  deployment: {
    dashboardTitle: '[Kubernetes OTel] Deployment Detail',
    scopeField: 'k8s.deployment.name',
    hiddenPanelIds: new Set(['v3-deployment-back-link', 'v3-wd-header-name', 'v4-wd-logs-card']),
  },
};

/**
 * Resolve the embedded-dashboard config for a resolved entity kind, or
 * `undefined` when the kind has no Kubernetes detail dashboard.
 */
export const getK8sDetailDashboardConfig = (
  kind: string | undefined
): K8sDetailDashboardConfig | undefined => (kind ? K8S_DETAIL_DASHBOARDS[kind] : undefined);

interface K8sDetailDashboardProps {
  readonly config: K8sDetailDashboardConfig;
  /** Value of `config.scopeField` for the clicked resource (the entity name). */
  readonly resourceName: string;
  readonly rangeFrom: string;
  readonly rangeTo: string;
}

/**
 * Embeds a Kubernetes OTel detail dashboard scoped to a single resource, for
 * rendering inside the entity flyout's Overview tab. Streams app injects this
 * through the flyout's `renderEntityDashboard` service so the shared flyout
 * package stays free of a `dashboard` plugin dependency.
 */
export const K8sDetailDashboard = ({
  config,
  resourceName,
  rangeFrom,
  rangeTo,
}: K8sDetailDashboardProps) => {
  const {
    dependencies: {
      start: { dashboard: dashboardStart },
    },
  } = useKibana();

  const [dashboardId, setDashboardId] = useState<string | null | undefined>(undefined);
  const [dashboardApi, setDashboardApi] = useState<DashboardApi | undefined>();

  const { dashboardTitle, scopeField, hiddenPanelIds } = config;

  // Resolve the saved-object id by title. `undefined` = resolving, `null` =
  // not found (package not installed in this space). Re-runs if the kind (and
  // thus the title) changes while the flyout is open.
  useEffect(() => {
    let cancelled = false;
    setDashboardId(undefined);
    dashboardStart
      .findDashboardsService()
      .then((service) => service.findByTitle(dashboardTitle))
      .then((result) => {
        if (!cancelled) setDashboardId(result?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setDashboardId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [dashboardStart, dashboardTitle]);

  const scopeFilter = useMemo<Filter>(
    () => ({
      meta: {
        alias: null,
        disabled: false,
        negate: false,
        key: scopeField,
        field: scopeField,
        type: 'phrase',
        params: { query: resourceName },
      },
      query: { match_phrase: { [scopeField]: resourceName } },
    }),
    [scopeField, resourceName]
  );

  // The scope filter is applied through `setFilters` once the API is available
  // (see the effect below) — `getInitialInput.filters` expects the serialized
  // filter shape, whereas `setFilters` takes runtime `@kbn/es-query` filters.
  const getCreationOptions = useCallback(
    (): Promise<DashboardCreationOptions> =>
      Promise.resolve<DashboardCreationOptions>({
        getInitialInput: () => ({
          viewMode: 'view',
          timeRange: { from: rangeFrom, to: rangeTo },
        }),
      }),
    [rangeFrom, rangeTo]
  );

  // Strip the stock dashboard's navigation cards / header row once it loads —
  // they make no sense embedded in the flyout. Declared before the filter
  // effect so the one-off `setState` doesn't clobber the scope filter below.
  useEffect(() => {
    if (!dashboardApi) return;
    const { attributes } = dashboardApi.getSerializedState();
    const widgets: DashboardWidgets = attributes.panels ?? [];
    // Hidden entries are all top-level cards, so a flat filter is enough
    // (sections only ever contain real chart panels). Both panels and sections
    // carry an optional `id`; only panel ids are in the hidden set.
    const nextPanels = widgets.filter((widget) => !(widget.id && hiddenPanelIds.has(widget.id)));
    if (nextPanels.length !== widgets.length) {
      dashboardApi.setState({ ...attributes, panels: nextPanels });
    }
  }, [dashboardApi, hiddenPanelIds]);

  // Keep the embedded dashboard in sync when the resource or time range
  // changes without remounting the renderer.
  useEffect(() => {
    if (!dashboardApi) return;
    dashboardApi.setFilters([scopeFilter]);
    dashboardApi.setTimeRange({ from: rangeFrom, to: rangeTo });
    dashboardApi.forceRefresh();
  }, [dashboardApi, scopeFilter, rangeFrom, rangeTo]);

  if (dashboardId === undefined) {
    return (
      <EuiText size="s" color="subdued" textAlign="center">
        <EuiLoadingSpinner size="m" />
      </EuiText>
    );
  }

  if (dashboardId === null) {
    return (
      <EuiEmptyPrompt
        iconType="dashboardApp"
        titleSize="xs"
        title={
          <h3>
            {i18n.translate('xpack.streams.entityCentricLab.k8sDashboard.notFoundTitle', {
              defaultMessage: 'Dashboard unavailable',
            })}
          </h3>
        }
        body={
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.streams.entityCentricLab.k8sDashboard.notFoundBody', {
                defaultMessage:
                  'The "{title}" dashboard is not installed in this space. Install the OpenTelemetry Kubernetes integration assets to see metrics here.',
                values: { title: dashboardTitle },
              })}
            </p>
          </EuiText>
        }
      />
    );
  }

  return (
    <div
      css={css`
        height: 70vh;
        min-height: 480px;
        overflow: auto;
      `}
      data-test-subj="entityCentricLabK8sDetailDashboard"
    >
      <DashboardRenderer
        savedObjectId={dashboardId}
        getCreationOptions={getCreationOptions}
        onApiAvailable={setDashboardApi}
      />
    </div>
  );
};
