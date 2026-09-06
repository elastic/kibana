/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { getViewSpecSchema, renderSlack, renderMarkdown } from '@kbn/adaptive-ui';
import type { StyleIsolation } from '../../common/config';
import { sampleViewSpec } from '../../common/sample_view_spec';
import { getAdaptiveViewText } from './cross_surface.test.helpers';
import { AdaptiveViewContainer, createViewRendererUiDefinition } from './view_renderer';

const SHADOW_HOST_SELECTOR = '[data-render-isolation="shadow"]';

describe('adaptive-ui "view" renderer', () => {
  it('accepts the sample payload against the renderer payloadSchema', () => {
    expect(() => getViewSpecSchema().parse(sampleViewSpec)).not.toThrow();
  });

  it('renders one ViewSpec payload across Kibana, Slack, and markdown', () => {
    const payload = getViewSpecSchema().parse(sampleViewSpec);

    const core = coreMock.createStart();
    const definition = createViewRendererUiDefinition(core);
    const result = render(<div>{definition.render(payload, {})}</div>);
    expect(getAdaptiveViewText(result)).toContain('Ingest lag detected');
    expect(getAdaptiveViewText(result)).toContain('logs-000042');

    const slack = renderSlack(sampleViewSpec);
    expect(slack.blocks.length).toBeGreaterThan(0);
    expect(slack.text.toLowerCase()).toContain('cluster health');
    expect(JSON.stringify(slack.blocks)).toContain('logs-000042');

    const markdown = renderMarkdown(sampleViewSpec);
    expect(markdown.toLowerCase()).toContain('cluster health');
    expect(markdown).toContain('logs-000042');
  });

  it('derives header metadata from the spec', () => {
    const core = coreMock.createStart();
    const definition = createViewRendererUiDefinition(core);
    expect(definition.getHeader?.(getViewSpecSchema().parse(sampleViewSpec))).toEqual({
      icon: 'visualizeApp',
      subtitle: 'Last 24 hours',
    });
  });

  it('mounts the HTML payload in a shadow root by default', () => {
    const core = coreMock.createStart();
    const { container } = render(<AdaptiveViewContainer spec={sampleViewSpec} {...{ core }} />);
    const host = container.querySelector(SHADOW_HOST_SELECTOR);
    expect(host?.shadowRoot?.querySelector('.aui')).not.toBeNull();
    expect(container.querySelector('.aui')).toBeNull();
    expect(host?.shadowRoot?.querySelector('.aui style')?.textContent).toContain('.aui{');
  });

  it('mounts the React surface in the light DOM when styleIsolation is document', () => {
    const core = coreMock.createStart();
    const { container } = render(
      <AdaptiveViewContainer spec={sampleViewSpec} {...{ core }} styleIsolation="document" />
    );
    expect(container.querySelector(SHADOW_HOST_SELECTOR)).toBeNull();
    expect(container.querySelector('.aui')).not.toBeNull();
    expect(container.textContent).toContain('Cluster health');
  });

  describe('framed', () => {
    const shadowRootOf = (container: HTMLElement) =>
      container.querySelector(SHADOW_HOST_SELECTOR)?.shadowRoot?.querySelector('.aui');

    it('draws the frame by default', () => {
      const core = coreMock.createStart();
      const { container } = render(<AdaptiveViewContainer spec={sampleViewSpec} {...{ core }} />);
      expect(shadowRootOf(container)?.classList.contains('fr')).toBe(true);
    });

    it('omits the frame when the host supplies chrome', () => {
      const core = coreMock.createStart();
      const { container } = render(
        <AdaptiveViewContainer spec={sampleViewSpec} {...{ core }} framed={false} />
      );
      const root = shadowRootOf(container);
      expect(root).not.toBeNull();
      expect(root?.classList.contains('fr')).toBe(false);
    });

    it.each<StyleIsolation>(['shadow', 'document'])(
      'honours framed on the %s surface',
      (styleIsolation) => {
        const core = coreMock.createStart();
        const rootOf = (container: HTMLElement) =>
          styleIsolation === 'shadow'
            ? container.querySelector(SHADOW_HOST_SELECTOR)?.shadowRoot?.querySelector('.aui')
            : container.querySelector('.aui');

        const framedRender = render(
          <AdaptiveViewContainer spec={sampleViewSpec} {...{ core, styleIsolation }} />
        );
        expect(rootOf(framedRender.container)?.classList.contains('fr')).toBe(true);

        const unframedRender = render(
          <AdaptiveViewContainer
            spec={sampleViewSpec}
            {...{ core, styleIsolation }}
            framed={false}
          />
        );
        expect(rootOf(unframedRender.container)?.classList.contains('fr')).toBe(false);
      }
    );
  });
});
