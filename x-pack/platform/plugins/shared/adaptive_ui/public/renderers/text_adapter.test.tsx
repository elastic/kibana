/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { validateView } from '@kbn/adaptive-ui';
import { sampleTextAttachment, toTextViewSpec } from '@kbn/adaptive-ui-adapters';
import { getAdaptiveViewText, renderCrossSurface } from './cross_surface.test.helpers';

describe('text attachment adapter', () => {
  it('renders one ViewSpec across text, markdown, Slack, and React', () => {
    const core = coreMock.createStart();
    const spec = toTextViewSpec(sampleTextAttachment);
    expect(validateView(spec).valid).toBe(true);

    const { react } = renderCrossSurface(spec, core);

    const rendered = getAdaptiveViewText(react);
    expect(rendered).toContain('Restarting the ingest pipeline');
    expect(rendered).toContain('logs-000042');
    expect(rendered).toContain('backlog cleared in 4.2s');
  });
});
