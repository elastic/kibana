/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { renderToStaticMarkup } from 'react-dom/server';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { createChildNodeWalker } from '@elastic/isomer-sdk';
import type { PrimitiveConformanceHarness } from '@elastic/isomer-sdk/testing';
import {
  assertPackRegistrationComplete,
  primitiveConformanceRows,
  runPrimitiveInventoryConformance,
} from '@elastic/isomer-sdk/testing';
import { componentsPack, componentsPrimitives } from './pack';

const runtime = createIsomerRuntime({ packs: [componentsPack] });

/** Conformance feeds renderers nodes validation rejects, on purpose. */
const collect = { onValidationError: 'collect' } as const;

// TODO: clintandrewhall - Replace with the runtime harness factory once https://github.com/elastic/isomer/issues/222 ships.
const harness: PrimitiveConformanceHarness = {
  wrapComposition: (node) => ({ type: 'view', title: 'Conformance fixture', body: [node] }),
  validateNode: (node) => runtime.validate({ type: 'view', body: [node] }).errors,
  validateComposition: (composition) => runtime.validate(composition),
  renderReact: (node) => renderToStaticMarkup(runtime.surfaces.react.renderNode(node)),
  collectStyles: (node) => runtime.surfaces.html.renderNode(node),
  renderText: (node) => runtime.surfaces.text.renderNode(node, collect),
  renderMarkdown: (node) => runtime.surfaces.markdown.renderNode(node, collect),
  renderSlack: (node) => runtime.surfaces.slack.renderNode(node, collect).blocks,
  renderHTML: (composition, options) =>
    runtime.surfaces.html.render(composition, options?.anchors ? { anchors: true } : {}),
  anchorWalk: createChildNodeWalker(runtime.primitives),
  renderTextComposition: (composition) => runtime.surfaces.text.render(composition),
  renderMarkdownComposition: (composition) => runtime.surfaces.markdown.render(composition),
  renderSlackComposition: (composition) => {
    const { blocks, text } = runtime.surfaces.slack.render(composition);
    return { blocks, text };
  },
};

describe('componentsPack', () => {
  it('registers the primitive each directory under primitives/ defines', async () => {
    await assertPackRegistrationComplete({
      primitivesDir: Path.join(__dirname, 'primitives'),
      registered: componentsPrimitives,
    });
  });

  it('puts every primitive in exactly one authoring group', () => {
    const grouped = (componentsPack.authoring?.groups ?? []).flatMap(({ types }) => types);

    expect([...grouped].sort()).toEqual(componentsPrimitives.map(({ type }) => type).sort());
  });

  it('passes inventory conformance', () => {
    runPrimitiveInventoryConformance(componentsPrimitives);
  });

  it.each(primitiveConformanceRows(componentsPrimitives))(
    '$type #$exampleIndex: $name',
    async (row) => {
      await row.run(row, harness);
    }
  );
});
