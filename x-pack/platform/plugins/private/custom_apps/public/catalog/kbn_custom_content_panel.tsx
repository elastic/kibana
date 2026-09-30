/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiCallOut } from '@elastic/eui';
import { CustomContentComponent } from '@kbn/custom-content-renderer';
import { ESQLVariableType } from '@kbn/esql-types';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { CatalogComponent } from '@kbn/a2ui-renderer';
import { useCustomAppServices } from './services_context';

/** Local and tiny: the shared catalog package's coercions are internal to it. */
const optionalStr = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value : undefined;
const num = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

/**
 * The panel owns its query rather than binding to the data model, so page filters
 * reach it as named parameters instead. Values are already resolved by the
 * renderer, and are flattened to scalars for the same reason the data-model path
 * is: an empty multi-value parameter has no defined substitution.
 */
const toVariables = (value: unknown): ESQLControlVariable[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null) return [];
    const { key, value: bound } = entry as { key?: unknown; value?: unknown };
    if (typeof key !== 'string') return [];
    const scalar = Array.isArray(bound)
      ? bound.filter((item) => item !== null && item !== undefined && item !== '').join(',')
      : bound === null || bound === undefined
      ? ''
      : String(bound);
    return [{ key, value: scalar, type: ESQLVariableType.VALUES }];
  });
};

/**
 * Kibana's Custom HTML panel, as a catalog component. One entry buys the agent
 * *any* visualization it can express as themed HTML and SVG — a honeycomb, a
 * sankey, a bullet gauge — with no new Kibana code per chart.
 *
 * Two limits are structural, not oversights:
 *
 * - **By value only.** Custom content has no saved object, so there is nothing to
 *   reference: its state is `{ template, esql_query }` stored inline wherever the
 *   panel lives. Carrying the template in the app document keeps the app
 *   self-contained, with nothing to resolve at load time.
 * - **It cannot call back.** The template renders in an iframe with `sandbox=""`
 *   and a `default-src 'none'` CSP, DOMPurify strips every event-handler
 *   attribute, and the server rejects `<script>` outright. Hover effects work
 *   through CSS; anything that must reach the app — opening a flyout, setting a
 *   filter — uses a catalog component instead.
 *
 * Rendered directly rather than through `EmbeddableRenderer`, following
 * `agent-builder-visualizations`' own out-of-dashboard usage: going through the
 * embeddable would add panel chrome and phase tracking we do not want, and buys
 * nothing since there is no reference to resolve.
 */
function KbnCustomContentPanelRenderer({ props }: { props: Record<string, unknown> }) {
  const services = useCustomAppServices();
  const [, setIsLoading] = useState(false);
  const onLoadingChange = useCallback((loading: boolean) => setIsLoading(loading), []);

  const template = optionalStr(props.template);
  if (!template) {
    return (
      <EuiCallOut announceOnMount size="s" color="warning" title="This panel has no template yet" />
    );
  }
  if (!services) return null;

  return (
    // The panel root is `flex: 1 1 100%` and collapses to its 200px minimum in a
    // block parent, so the container has to be a column flexbox with a height.
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: num(props.height, 0) > 0 ? num(props.height) : '100%',
        minHeight: 200,
      }}
    >
      <CustomContentComponent
        services={{
          http: services.http,
          uiSettings: services.uiSettings,
          search: services.search,
        }}
        embeddableId="custom-apps-panel"
        esqlQuery={optionalStr(props.esql)}
        timeRange={services.timeRange}
        generationVersion={0}
        savedTemplate={template}
        isApproximate={false}
        projectRouting={undefined}
        query={undefined}
        filters={undefined}
        esqlVariables={toVariables(props.variables)}
        previewHtml={null}
        onLoadingChange={onLoadingChange}
      />
    </div>
  );
}

export const KbnCustomContentPanel: CatalogComponent = {
  name: 'KbnCustomContentPanel',
  render: ({ props }) => <KbnCustomContentPanelRenderer props={props} />,
};
