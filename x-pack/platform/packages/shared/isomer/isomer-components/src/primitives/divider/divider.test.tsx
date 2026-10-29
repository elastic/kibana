/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { buildJsxShim } from '@elastic/isomer-sdk/author';
import { componentsPack, componentsPrimitives } from '../../pack';
import type { DividerNode } from '.';

const { surfaces, validate } = createIsomerRuntime({ packs: [componentsPack] });
const { Composition, Divider, toComposition } = buildJsxShim(componentsPrimitives);

const node: DividerNode = { type: 'divider' };

describe('divider', () => {
  it('takes no fields', () => {
    const labeled = { type: 'divider', label: 'Evidence' };

    expect(validate({ type: 'view', body: [labeled] }).valid).toBe(false);
  });

  it('renders a rule on every surface', () => {
    expect(surfaces.slack.renderNode(node).blocks).toEqual([{ type: 'divider' }]);
    expect(renderToStaticMarkup(surfaces.react.renderNode(node))).toBe(
      '<hr class="componentsDivider-root"/>'
    );
    expect(surfaces.markdown.renderNode(node)).toBe('---');
    expect(surfaces.text.renderNode(node)).toBe('---');
  });

  it('is authored as a self-closing element', () => {
    expect(
      toComposition(
        <Composition>
          <Divider />
        </Composition>
      ).body
    ).toEqual([node]);
  });
});
