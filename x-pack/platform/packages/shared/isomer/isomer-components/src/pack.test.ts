/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { createRuntimeConformanceHarness } from '@elastic/isomer-runtime/testing';
import {
  assertPackIconsValid,
  assertPackRegistrationComplete,
  primitiveConformanceRows,
  runPrimitiveInventoryConformance,
} from '@elastic/isomer-sdk/testing';
import { componentsPack, componentsPrimitives } from './pack';
import type { MarkdownNode } from './primitives';

const runtime = createIsomerRuntime({ packs: [componentsPack] });

const harness = createRuntimeConformanceHarness(runtime);

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

  it('gives every primitive an icon that follows the icon rules', () => {
    expect(componentsPrimitives.filter(({ icon }) => !icon).map(({ type }) => type)).toEqual([]);
    assertPackIconsValid(componentsPack);
  });

  it('styles the HTML surface with the Kibana theme', () => {
    const alerts: MarkdownNode = { type: 'markdown', text: 'There are **3** open alerts.' };
    const { html, css } = runtime.surfaces.html.render({ type: 'view', body: [alerts] });

    expect(html).toMatch(/<section class="isomer[^"]*"/);
    expect(html).toContain('class="componentsMarkdown-root"');
    expect(css).toMatch(/\.isomer\{[^}]*font-family:var\(--isomer-font-family-sans\)/);
    expect(css).toContain('.componentsMarkdown-root{');
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
