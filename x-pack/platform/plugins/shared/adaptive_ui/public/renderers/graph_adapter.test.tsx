/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { renderSlack, validateView, type ViewSpec } from '@kbn/adaptive-ui';
import { sampleGraph, toGraphViewSpec } from '@kbn/adaptive-ui-adapters';
import { getAdaptiveViewText, renderCrossSurface } from './cross_surface.test.helpers';

const graphNodesOf = ({ body }: ViewSpec): unknown => {
  const node = body.find(({ type }) => type === 'graph');
  if (!node || !('nodes' in node)) {
    throw new Error('expected a graph node in the spec body');
  }
  return node.nodes;
};

describe('graph attachment adapter', () => {
  it('renders one ViewSpec across text, markdown, Slack, and React', () => {
    const core = coreMock.createStart();
    const spec = toGraphViewSpec(sampleGraph);
    expect(validateView(spec).valid).toBe(true);

    const { react, text, markdown } = renderCrossSurface(spec, core);

    const rendered = getAdaptiveViewText(react);
    expect(rendered).toContain('Lateral movement path');
    expect(rendered).toContain('lateral move');
    expect(rendered).toContain('finance-db-01');

    expect(text).toContain('finance-db-01');
    expect(markdown).toContain('finance-db-01');
  });

  it('draws the topology as a graph node, not a connection table', () => {
    const spec = toGraphViewSpec(sampleGraph);

    expect(spec.body.map(({ type }) => type)).toEqual(['graph']);
  });

  // `post_view_to_slack` opts into assets so the diagram uploads as a PNG; without
  // that the same spec degrades to the primitive's markdown, never a broken image.
  it('uploads the diagram as a Slack image only when assets are collected', () => {
    const spec = toGraphViewSpec(sampleGraph);

    const withAssets = renderSlack(spec, { collectAssets: true });
    expect(withAssets.assets).toHaveLength(1);
    expect(withAssets.assets[0].node.type).toBe('graph');
    expect(withAssets.blocks.some((block) => block.type === 'image')).toBe(true);

    const textOnly = renderSlack(spec);
    expect(textOnly.assets).toHaveLength(0);
    expect(textOnly.blocks.some((block) => block.type === 'image')).toBe(false);
  });

  it('trims a topology past the primitive budget and says what it dropped', () => {
    const nodes = Array.from({ length: 30 }, (_, index) => ({
      id: `host-${index}`,
      label: `host-${index}`,
    }));
    const spec = toGraphViewSpec({
      title: 'Wide blast radius',
      nodes,
      edges: nodes.slice(1).map(({ id }) => ({ source: 'host-0', target: id })),
    });

    expect(validateView(spec).valid).toBe(true);
    expect(graphNodesOf(spec)).toHaveLength(24);

    const rendered = renderCrossSurface(spec, coreMock.createStart()).text;
    expect(rendered).toContain('6 more nodes');
  });

  it('says so rather than emitting an empty graph when there are no nodes', () => {
    const spec = toGraphViewSpec({ nodes: [], edges: [] });

    expect(validateView(spec).valid).toBe(true);
    expect(spec.body.map(({ type }) => type)).toEqual(['callout']);
    expect(renderCrossSurface(spec, coreMock.createStart()).text).toContain('no nodes to draw');
  });
});
