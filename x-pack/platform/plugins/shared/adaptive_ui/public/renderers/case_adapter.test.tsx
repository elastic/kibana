/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { validateView } from '@kbn/adaptive-ui';
import { sampleCase, toCaseViewSpec } from '@kbn/adaptive-ui-adapters';
import { getAdaptiveViewText, renderCrossSurface } from './cross_surface.test.helpers';

describe('case attachment adapter (record)', () => {
  it('renders one ViewSpec across text, markdown, Slack, and React', () => {
    const core = coreMock.createStart();
    const spec = toCaseViewSpec(sampleCase);
    expect(validateView(spec).valid).toBe(true);

    const { react } = renderCrossSurface(spec, core);

    const rendered = getAdaptiveViewText(react);
    expect(rendered).toContain('#101 Suspicious PowerShell on finance hosts');
    expect(rendered).toContain('24');
    expect(rendered).toContain('Assignees');
    expect(rendered).not.toContain('[object Object]');
    expect(rendered).toContain('Go to case');
    const details = spec.body.find((node) => node.type === 'descriptionList');
    expect(details).toEqual(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({ title: 'Assignees', description: '2' }),
        ]),
      })
    );
  });
});
