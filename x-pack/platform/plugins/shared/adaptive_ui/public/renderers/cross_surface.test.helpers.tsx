/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, type RenderResult } from '@testing-library/react';
import type { CoreStart } from '@kbn/core/public';
import { renderMarkdown, renderSlack, renderText, type ViewSpec } from '@kbn/adaptive-ui';
import { AdaptiveViewContainer } from './view_renderer';

const SHADOW_HOST_SELECTOR = '[data-render-isolation="shadow"]';

export interface CrossSurfaceRenders {
  text: string;
  markdown: string;
  slack: ReturnType<typeof renderSlack>;
  react: RenderResult;
}

/**
 * Renders one {@link ViewSpec} across the four Agent Builder surfaces an
 * archetype golden test asserts against: plain text, GitHub markdown, Slack
 * Block Kit, and the Kibana chat body (HTML payload in a shadow root).
 */
export const renderCrossSurface = (spec: ViewSpec, core: CoreStart): CrossSurfaceRenders => ({
  text: renderText(spec),
  markdown: renderMarkdown(spec),
  slack: renderSlack(spec),
  react: render(<AdaptiveViewContainer spec={spec} {...{ core }} />),
});

export const getAdaptiveViewRoot = (result: RenderResult): ParentNode => {
  const host = result.container.querySelector(SHADOW_HOST_SELECTOR);
  return host?.shadowRoot ?? result.container;
};

export const getAdaptiveViewText = (result: RenderResult): string => {
  const root = getAdaptiveViewRoot(result);
  const aui = 'querySelector' in root ? root.querySelector('.aui') : null;
  if (!aui) {
    return root.textContent ?? '';
  }
  const clone = aui.cloneNode(true) as Element;
  clone.querySelectorAll('style, script').forEach((el) => el.remove());
  return clone.textContent ?? '';
};
