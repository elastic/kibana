/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'node:assert/strict';

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { createChildNodeWalker } from '@elastic/isomer-sdk';
import {
  type PrimitiveConformanceHarness,
  primitiveConformanceRows,
  runPrimitiveInventoryConformance,
} from '@elastic/isomer-sdk/testing';
import { chartsPack as pack } from './pack';

/** Renders nodes validation rejects, which these tests feed renderers on purpose. */
const collect = { onValidationError: 'collect' } as const;

const runtime = createIsomerRuntime({ packs: [pack] });

const varRefs = (css: string): string[] => [
  ...new Set([...css.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]!)),
];

const harness: PrimitiveConformanceHarness = {
  sizesFromNodeHeights: false,
  wrapComposition: (node) => ({
    type: 'view',
    title: 'Conformance fixture',
    body: [node],
  }),
  validateNode: (node) => {
    const result = runtime.validate({ type: 'view', body: [node] });
    return result.valid ? [] : result.errors;
  },
  validateComposition: (composition) => runtime.validate(composition),
  renderReact: (node) => runtime.surfaces.react.render({ type: 'view', body: [node] }),
  collectStyles: (node) => {
    runtime.surfaces.react.render({ type: 'view', body: [node] });
  },
  renderText: (node) => runtime.surfaces.text.renderNode(node, collect),
  renderMarkdown: (node) => runtime.surfaces.markdown.renderNode(node, collect),
  renderSlack: (node) => runtime.surfaces.slack.renderNode(node, collect).blocks,
  renderHTML: (composition, options) =>
    runtime.surfaces.html.render(composition, options?.anchors ? { anchors: true } : {}),
  anchorWalk: createChildNodeWalker(runtime.primitives),
  assertVarRefsHaveDeclarations: (css) => {
    const missing = varRefs(css).filter((name) => !new RegExp(`${name}\\s*:`).test(css));
    assert.deepEqual(missing, [], `undeclared css vars: ${missing.join(', ')}`);
  },
  renderTextComposition: (composition) => runtime.surfaces.text.render(composition),
  renderMarkdownComposition: (composition) => runtime.surfaces.markdown.render(composition),
  renderSlackComposition: (composition) => {
    const { blocks, text } = runtime.surfaces.slack.render(composition);
    return { blocks, text };
  },
};

describe('charts pack inventory', () => {
  it('passes inventory conformance', () => {
    runPrimitiveInventoryConformance(pack.primitives);
  });
});

describe('charts pack conformance', () => {
  it.each(primitiveConformanceRows(pack.primitives))('$type #$exampleIndex: $name', async (row) => {
    await row.run(row, harness);
  });
});
