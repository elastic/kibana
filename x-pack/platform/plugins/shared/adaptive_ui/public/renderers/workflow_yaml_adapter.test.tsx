/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { validateView } from '@kbn/adaptive-ui';
import { sampleWorkflowYaml, toWorkflowYamlViewSpec } from '@kbn/adaptive-ui-adapters';
import { getAdaptiveViewText, renderCrossSurface } from './cross_surface.test.helpers';

describe('workflow.yaml attachment adapter', () => {
  it('renders one ViewSpec across text, markdown, Slack, and React', () => {
    const core = coreMock.createStart();
    const spec = toWorkflowYamlViewSpec(sampleWorkflowYaml);
    expect(validateView(spec).valid).toBe(true);

    const { react } = renderCrossSurface(spec, core);

    const rendered = getAdaptiveViewText(react);
    expect(rendered).toContain('Enrich and notify on new critical alert');
    expect(rendered).toContain('Steps');
    expect(rendered).toContain('post-to-slack');
  });
});
