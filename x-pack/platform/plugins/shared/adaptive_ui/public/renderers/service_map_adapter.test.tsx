/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { validateView } from '@kbn/adaptive-ui';
import { sampleServiceMap, toServiceMapViewSpec } from '@kbn/adaptive-ui-adapters';
import { getAdaptiveViewText, renderCrossSurface } from './cross_surface.test.helpers';

describe('observability.service-map attachment adapter', () => {
  it('renders one ViewSpec across text, markdown, Slack, and React', () => {
    const core = coreMock.createStart();
    const spec = toServiceMapViewSpec(sampleServiceMap);
    expect(validateView(spec).valid).toBe(true);

    const { react } = renderCrossSurface(spec, core);

    const rendered = getAdaptiveViewText(react);
    expect(rendered).toContain('payment-service');
    expect(rendered).toContain('320 ms');
    expect(rendered).toContain('Dependencies');
  });

  it('keeps latency and error rate on the edge so no companion table is needed', () => {
    const spec = toServiceMapViewSpec(sampleServiceMap);

    expect(spec.body.map(({ type }) => type)).toEqual(['graph']);
    expect(spec.body[0]).toMatchObject({
      edges: expect.arrayContaining([
        expect.objectContaining({
          source: 'checkout',
          target: 'payment-service',
          label: '320 ms · 6.1%',
          tone: 'danger',
          weight: 1200,
        }),
      ]),
    });
  });

  it('carries service health onto the node tone', () => {
    const spec = toServiceMapViewSpec(sampleServiceMap);

    expect(spec.body[0]).toMatchObject({
      nodes: expect.arrayContaining([
        expect.objectContaining({ id: 'cart', tone: 'success' }),
        expect.objectContaining({ id: 'postgres', tone: 'warning' }),
        expect.objectContaining({ id: 'checkout', tone: 'danger' }),
      ]),
    });
  });

  it('omits an edge label when the connection reports no metrics', () => {
    const spec = toServiceMapViewSpec({
      services: [{ name: 'a' }, { name: 'b' }],
      connections: [{ source: 'a', target: 'b' }],
    });

    expect(validateView(spec).valid).toBe(true);
    expect(spec.body[0]).toMatchObject({
      edges: [{ source: 'a', target: 'b' }],
    });
  });
});
