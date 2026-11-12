/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { VisualizationServices } from './services';
import { InlineVisualization } from './inline_visualization';

jest.mock('./visualize_custom_content', () => ({
  VisualizeCustomContent: ({ esqlQueries }: { esqlQueries: readonly string[] }) => (
    <div data-test-subj="customContent">{JSON.stringify(esqlQueries)}</div>
  ),
}));
jest.mock('./visualize_lens', () => ({ VisualizeLens: () => <div data-test-subj="lens" /> }));

const services = {} as VisualizationServices;
const visualization = { template: '<div>board</div>' };

describe('InlineVisualization', () => {
  it.each([
    ['a list of queries', ['FROM a', 'FROM b'], ['FROM a', 'FROM b']],
    ['a single string, as saved before a panel could have several', 'FROM a', ['FROM a']],
    ['no queries', undefined, []],
  ])('gives custom content its queries as a list from %s', async (_label, esql, expected) => {
    render(
      <InlineVisualization
        services={services}
        renderer="custom_content"
        visualization={visualization}
        esql={esql}
      />
    );

    expect((await screen.findByTestId('customContent')).textContent).toBe(JSON.stringify(expected));
  });

  it('renders a Lens chart whose esql is a string, as before', async () => {
    render(
      <InlineVisualization
        services={services}
        visualization={{}}
        esql="FROM logs | STATS count()"
      />
    );

    expect(await screen.findByTestId('lens')).toBeTruthy();
  });
});
