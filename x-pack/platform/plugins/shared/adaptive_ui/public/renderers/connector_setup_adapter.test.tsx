/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { validateView } from '@kbn/adaptive-ui';
import {
  sampleConnectorSetup,
  toConnectorSetupViewSpec,
} from '@kbn/adaptive-ui-adapters';
import { getAdaptiveViewText, renderCrossSurface } from './cross_surface.test.helpers';

describe('connector_setup attachment adapter (prompt subset)', () => {
  it('renders one ViewSpec across text, markdown, Slack, and React', () => {
    const core = coreMock.createStart();
    const spec = toConnectorSetupViewSpec(sampleConnectorSetup);
    expect(validateView(spec).valid).toBe(true);

    const { react } = renderCrossSurface(spec, core);

    const rendered = getAdaptiveViewText(react);
    expect(rendered).toContain('OpenAI connector');
    expect(rendered).toContain('Setup needed');
    expect(rendered).toContain('generative AI connector');
  });
});
