/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { validateView } from '@kbn/adaptive-ui';
import {
  sampleSigEvent,
  toSigEventViewSpec,
  toSignificantEventAttachmentViewSpec,
} from '@kbn/adaptive-ui-adapters';
import { getAdaptiveViewText, renderCrossSurface } from './cross_surface.test.helpers';

describe('platform.sig_event attachment adapter', () => {
  it('renders one ViewSpec across text, markdown, Slack, and React', () => {
    const core = coreMock.createStart();
    const spec = toSigEventViewSpec(sampleSigEvent);
    expect(validateView(spec).valid).toBe(true);

    const { react } = renderCrossSurface(spec, core);

    const rendered = getAdaptiveViewText(react);
    expect(rendered).toContain('Dropped payments on payment-service');
    expect(rendered).toContain('Root cause');
    expect(rendered).toContain('Payment error rate');
    expect(rendered).toContain('View in Nightshift');

    expect(spec.body.some((node) => node.type === 'callout')).toBe(true);
    expect(spec.body.some((node) => node.type === 'panel')).toBe(false);

    const actionsNode = spec.body.find((node) => node.type === 'actions');
    expect(actionsNode).toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            label: 'View in Nightshift',
            href: '/app/nightshift?eventUuid=sigev-7f3a9c-v1&eventId=sigev-7f3a9c',
          }),
          expect.objectContaining({
            label: 'Open in Streams',
            href: '/app/streams/significant_events/sigev-7f3a9c',
          }),
        ],
      })
    );
  });
});

describe('platform.sig_event live attachment adapter', () => {
  it('renders a canonical SignificantEvent across surfaces with a Nightshift href', () => {
    const core = coreMock.createStart();
    const spec = toSignificantEventAttachmentViewSpec({
      title: 'Payment outage',
      summary: 'Payments are failing.',
      status: 'open',
      severity: '60-high',
      confidence: 0.8,
      event_id: 'payment-outage',
      event_uuid: 'event-1',
      symptom_hypothesis: 'The payment-service connection pool is exhausted.',
      stream_names: ['logs.payment'],
      signals: [
        {
          type: 'detection',
          stream_name: 'logs.payment',
          verdict: 'confirms',
          description: '5xx on POST /charge.',
          metadata: { rule_name: 'Payment error rate' },
        },
      ],
    });
    expect(validateView(spec).valid).toBe(true);

    const rendered = getAdaptiveViewText(renderCrossSurface(spec, core).react);
    expect(rendered).toContain('Payment outage');
    expect(rendered).toContain('Payments are failing.');
    expect(rendered).toContain('View in Nightshift');

    expect(spec.body.some((node) => node.type === 'callout')).toBe(true);
    expect(spec.body.some((node) => node.type === 'panel')).toBe(false);

    const actionsNode = spec.body.find((node) => node.type === 'actions');
    expect(actionsNode).toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            label: 'View in Nightshift',
            href: '/app/nightshift?eventUuid=event-1&eventId=payment-outage',
          }),
        ],
      })
    );
  });
});
