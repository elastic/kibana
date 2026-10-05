/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { VisualizationRenderer } from '@kbn/agent-builder-visualizations-common';
import { InlineVisualization } from './inline_visualization';
import type { VisualizationServices } from './services';

jest.mock('./visualize_lens', () => ({
  VisualizeLens: () => <span data-test-subj="lens-renderer" />,
}));
jest.mock('./visualize_vega', () => ({
  VisualizeVega: () => <span data-test-subj="vega-renderer" />,
}));
jest.mock('./visualize_custom_content', () => ({
  VisualizeCustomContent: () => <span data-test-subj="custom-content-renderer" />,
}));

const services = {} as VisualizationServices;

/**
 * Every renderer added so far was first matched as "not the previous one", which routes an
 * unhandled renderer through Lens: a broken chart rather than an error. Each case is pinned,
 * including `undefined`, which is how attachments predating the discriminator render.
 */
const cases: Array<[string, VisualizationRenderer | undefined, string]> = [
  ['lens', 'lens', 'lens-renderer'],
  ['vega', 'vega', 'vega-renderer'],
  ['custom content', 'custom_content', 'custom-content-renderer'],
  ['no renderer (legacy attachment)', undefined, 'lens-renderer'],
];

/** Distinct components — `lens-renderer` is the target of two cases. */
const allTestSubjects = [...new Set(cases.map(([, , testSubj]) => testSubj))];

describe('InlineVisualization', () => {
  it.each(cases)('renders the %s renderer', async (_name, renderer, expectedTestSubj) => {
    render(
      <InlineVisualization services={services} renderer={renderer} visualization={{ type: 'x' }} />
    );

    expect(await screen.findByTestId(expectedTestSubj)).toBeTruthy();
  });

  it('routes each renderer to exactly one component', async () => {
    for (const [, renderer, expectedTestSubj] of cases) {
      const { unmount } = render(
        <InlineVisualization services={services} renderer={renderer} visualization={{}} />
      );

      await screen.findByTestId(expectedTestSubj);
      const rendered = allTestSubjects.filter(
        (testSubj) => screen.queryByTestId(testSubj) !== null
      );
      expect(rendered).toEqual([expectedTestSubj]);

      unmount();
    }
  });
});
