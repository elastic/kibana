/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { validateView } from '@kbn/adaptive-ui';
import { sampleInvestigation, toInvestigationViewSpec } from '@kbn/adaptive-ui-adapters';
import { getAdaptiveViewText, renderCrossSurface } from './cross_surface.test.helpers';

describe('nightshift.investigation adapter', () => {
  it('renders one ViewSpec across text, markdown, Slack, and React', () => {
    const core = coreMock.createStart();
    const spec = toInvestigationViewSpec(sampleInvestigation);
    expect(validateView(spec).valid).toBe(true);

    const { react, slack } = renderCrossSurface(spec, core);

    const rendered = getAdaptiveViewText(react);
    expect(rendered).toContain(
      'payment-service v2.4.1 lowered the database connection pool ceiling'
    );
    expect(rendered).toContain('Root cause');
    expect(rendered).toContain('Roll back payment-service to v2.4.0');
    expect(rendered).toContain('Missing database spans');
    expect(rendered).toContain('5xx on POST /charge');
    expect(rendered).toContain('View in Nightshift');

    const calloutNode = spec.body.find((node) => node.type === 'callout');
    expect(calloutNode).toEqual(expect.objectContaining({ title: 'Root cause', tone: 'primary' }));
    expect(spec.body.some((node) => node.type === 'table')).toBe(false);
    expect(spec.body.filter((node) => node.type === 'codeBlock')).toEqual([
      expect.objectContaining({ language: 'text' }),
    ]);

    const slackJson = JSON.stringify(slack.blocks);
    expect(slackJson).toContain('/app/nightshift?');
    expect(slackJson).toContain('github.com/acme/payment-service');
    expect(slackJson).not.toContain('DATE_TRUNC');
    const actionsNode = spec.body.find((node) => node.type === 'actions');
    expect(actionsNode).toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            label: 'View in Nightshift',
            href: '/app/nightshift?eventUuid=sigev-7f3a9c-v1&eventId=sigev-7f3a9c',
          }),
        ],
      })
    );
  });

  it('maps markdown conclusion and gaps_found the way the Nightshift flyout does', () => {
    const core = coreMock.createStart();
    const spec = toInvestigationViewSpec({
      event_id: 'checkout',
      event_uuid: 'checkout-v1',
      status: 'completed',
      summary: 'Investigate the latency spike affecting checkout requests.',
      hypotheses: [
        {
          candidate: 'The latest checkout deployment introduced a database lookup regression',
          confidence: 0.92,
          status: 'confirmed',
          reason:
            'Database query time increased immediately after the deployment while upstream dependency latency remained stable.',
        },
      ],
      conclusion: `# Conclusion
The latest checkout deployment introduced a synchronous inventory lookup that increased request latency.

## Next Steps
- Roll back the checkout deployment · Revert version 2026.07.24-1 and monitor P95 latency.
- Add a deployment guardrail · Block releases when checkout latency exceeds the service baseline.`,
      gaps_found: [
        'Missing database spans · The slow inventory query is not represented in distributed traces.',
        'Limited deployment metadata · Commit identifiers are not included in checkout logs.',
      ],
    });

    expect(validateView(spec).valid).toBe(true);
    const rendered = getAdaptiveViewText(renderCrossSurface(spec, core).react);
    expect(rendered).toContain(
      'The latest checkout deployment introduced a synchronous inventory lookup'
    );
    expect(rendered).not.toContain('## Next Steps');
    expect(rendered).toContain('Roll back the checkout deployment');
    expect(rendered).toContain('Missing database spans');
  });
});
