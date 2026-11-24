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
import type { SlackSectionBlock } from '@elastic/isomer-sdk/slack';
import { SLACK_LIMITS } from '@elastic/isomer-sdk/slack';
import { componentsPack, componentsPrimitives } from '../../pack';
import type { FieldsNode } from '.';

const { surfaces, validate } = createIsomerRuntime({ packs: [componentsPack] });
const { Composition, Fields, toComposition } = buildJsxShim(componentsPrimitives);

const fieldsOf = (...items: FieldsNode['items']): FieldsNode => ({ type: 'fields', items });

const slackFields = (node: FieldsNode) =>
  (surfaces.slack.renderNode(node).blocks as SlackSectionBlock[]).flatMap(
    ({ fields = [] }) => fields
  );

describe('fields', () => {
  it('takes 1 to 10 items with a label and a value', () => {
    const view = (node: FieldsNode) => validate({ type: 'view', body: [node] });
    const item = { label: 'App', value: 'Discover' };

    expect(view(fieldsOf()).valid).toBe(false);
    expect(view(fieldsOf(...Array(10).fill(item))).valid).toBe(true);
    expect(view(fieldsOf(...Array(11).fill(item))).valid).toBe(false);
    expect(view(fieldsOf({ label: ' ', value: 'x' })).valid).toBe(false);
    expect(view(fieldsOf({ label: 'App', value: 'x'.repeat(1001) })).valid).toBe(false);
    expect(view(fieldsOf({ label: 'Size', value: { raw: 1024, format: 'bytes' } })).valid).toBe(
      true
    );
  });

  it('renders one Slack section with a bold-labeled mrkdwn field per item, escaped', () => {
    expect(
      surfaces.slack.renderNode(
        fieldsOf({ label: 'App', value: 'Discover' }, { label: 'A & <b>', value: 'x > y' })
      ).blocks
    ).toEqual([
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: '*App*\nDiscover', verbatim: true },
          { type: 'mrkdwn', text: '*A &amp; &lt;b&gt;*\nx &gt; y', verbatim: true },
        ],
      },
    ]);
  });

  it('clamps an escaped value to the field limit without cutting an entity', () => {
    const [field] = slackFields(fieldsOf({ label: 'Note', value: '&'.repeat(1000) }));

    expect(field.text.length).toBeLessThanOrEqual(SLACK_LIMITS.sectionFieldChars);
    expect(field.text).toMatch(/^\*Note\*\n(&amp;)+…$/);
  });

  it('formats structured values the same on every surface', () => {
    const node = fieldsOf(
      { label: 'Size', value: { raw: 5368709120, format: 'bytes' } },
      { label: 'Rate', value: { raw: 0.042, format: 'percent' } }
    );
    const text = surfaces.text.renderNode(node);
    const [size, rate] = slackFields(node).map(({ text: field }) => field.split('\n')[1]);

    expect(text).toBe(`Size: ${size}\nRate: ${rate}`);
    expect(surfaces.markdown.renderNode(node)).toBe(`- **Size**: ${size}\n- **Rate**: ${rate}`);
    expect(renderToStaticMarkup(surfaces.react.renderNode(node))).toContain(`<dd`);
    expect(renderToStaticMarkup(surfaces.react.renderNode(node))).toContain(`>${rate}</dd>`);
  });

  it('renders a description list in React', () => {
    expect(
      renderToStaticMarkup(surfaces.react.renderNode(fieldsOf({ label: 'App', value: 'Discover' })))
    ).toBe(
      '<dl class="componentsFields-root"><dt class="componentsFields-label">App</dt><dd class="componentsFields-value">Discover</dd></dl>'
    );
  });

  it('is authored from Fields.Item children', () => {
    expect(
      toComposition(
        <Composition>
          <Fields>
            <Fields.Item label="App">Discover</Fields.Item>
            <Fields.Item label="Docs" value={{ raw: 1284, format: 'compact' }} />
          </Fields>
        </Composition>
      ).body
    ).toEqual([
      fieldsOf(
        { label: 'App', value: 'Discover' },
        { label: 'Docs', value: { raw: 1284, format: 'compact' } }
      ),
    ]);
  });
});
