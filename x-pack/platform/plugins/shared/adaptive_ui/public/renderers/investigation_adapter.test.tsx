/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { validateView } from '@kbn/adaptive-ui';
import { sampleInvestigation, toInvestigationViewSpec } from '../../common/adapters/investigation';
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

    expect(JSON.stringify(slack.blocks)).toContain('/app/nightshift?');
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
});
