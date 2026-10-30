/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { definePrimitivePack } from '@elastic/isomer-sdk';
import { createKibanaIsomerRuntime } from '@kbn/isomer';
import { componentsPack } from '@kbn/isomer-components';

import { createRuntime } from './create_runtime';
import { describeVocabulary } from './vocabulary';

describe('describeVocabulary', () => {
  it('digests every pack of the plugin runtime, and the same runtime twice alike', async () => {
    const first = describeVocabulary(await createRuntime());
    const second = describeVocabulary(await createRuntime());
    expect(Object.keys(first.packs)).toEqual(['components', 'vega', 'charts', 'maps', 'dashboard']);
    expect(first.packs.components.primitives).toContain('markdown');
    expect(first.packs.components.vocabulary).toMatch(/^[0-9a-f]{16}$/);
    expect(first).toEqual(second);
  });

  it('changes with the packs a runtime composes, and the pack digest stays', async () => {
    const plugin = describeVocabulary(await createRuntime());
    const components = describeVocabulary(createKibanaIsomerRuntime({ packs: [componentsPack] }));
    expect(components.packs.components).toEqual(plugin.packs.components);
    expect(components.vocabulary).not.toBe(plugin.vocabulary);
  });

  it('ignores the prose of a schema', () => {
    const [markdown] = componentsPack.primitives;
    const reworded = definePrimitivePack({
      id: 'components',
      primitives: [
        {
          ...markdown,
          catalog: { ...markdown.catalog, description: 'Rewritten for a different reader.' },
          schema: markdown.schema.describe('Rewritten for a different reader.'),
        },
      ],
    });
    const original = definePrimitivePack({ id: 'components', primitives: [markdown] });
    expect(describeVocabulary({ packs: [reworded] }).vocabulary).toBe(
      describeVocabulary({ packs: [original] }).vocabulary
    );
  });
});
