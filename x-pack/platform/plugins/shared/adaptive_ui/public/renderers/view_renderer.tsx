/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import type { RendererUIDefinition } from '@kbn/agent-builder-browser';
import { KibanaAdaptiveView, createKibanaAdapterServices } from '@kbn/adaptive-ui/react';
import { getViewSpecSchema, parseViewSpec, type ViewSpec } from '@kbn/adaptive-ui';
import type { StyleIsolation } from '../../common/config';
import { ADAPTIVE_UI_VIEW_RENDERER_TYPE } from '../../common/constants';

export interface AdaptiveViewContainerProps {
  spec: ViewSpec;
  core: CoreStart;
  styleIsolation?: StyleIsolation;
  framed?: boolean;
}

// The plugin's `styleIsolation` setting names the boundary; the adapter's
// `surface` names the renderer that produces it. `shadow` is the HTML surface
// behind a shadow root, `document` the React surface in the light DOM.
const SURFACE_BY_ISOLATION = {
  shadow: 'html',
  document: 'react',
} as const satisfies Record<StyleIsolation, 'html' | 'react'>;

/**
 * Canonical Adaptive UI view component. Base-path rewriting, capability
 * gating, EUI color mode, and shadow isolation all belong to
 * {@link KibanaAdaptiveView}; this adds only the Kibana layout box around it.
 */
export const AdaptiveViewContainer: React.FC<AdaptiveViewContainerProps> = ({
  spec,
  core,
  styleIsolation = 'shadow',
  framed = true,
}) => {
  const { euiTheme } = useEuiTheme();
  const services = React.useMemo(() => createKibanaAdapterServices(core), [core]);

  const containerStyles = css`
    width: 100%;
    ${framed ? '' : `padding: ${euiTheme.size.l};`}
  `;

  return (
    <div css={containerStyles}>
      <KibanaAdaptiveView
        surface={SURFACE_BY_ISOLATION[styleIsolation]}
        {...{ spec, services, framed }}
        fluid
      />
    </div>
  );
};

const renderPayload = (
  payload: Record<string, unknown>,
  core: CoreStart,
  styleIsolation: StyleIsolation,
  framed: boolean
): React.ReactElement => {
  const { spec } = parseViewSpec(payload);
  return spec ? <AdaptiveViewContainer spec={spec} {...{ core, styleIsolation, framed }} /> : <></>;
};

export const createViewRendererUiDefinition = (
  core: CoreStart,
  styleIsolation: StyleIsolation = 'shadow'
): RendererUIDefinition<ReturnType<typeof getViewSpecSchema>> => ({
  type: ADAPTIVE_UI_VIEW_RENDERER_TYPE,
  payloadSchema: getViewSpecSchema(),
  // Inline `<render>` output stands alone in the markdown flow, so it keeps the
  // frame; the canvas surface supplies flyout chrome of its own.
  render: (payload) => renderPayload(payload, core, styleIsolation, true),
  renderCanvas: (payload) => renderPayload(payload, core, styleIsolation, false),
  getHeader: (payload) => ({
    icon: 'visualizeApp',
    subtitle: parseViewSpec(payload).spec?.subtitle,
  }),
});
