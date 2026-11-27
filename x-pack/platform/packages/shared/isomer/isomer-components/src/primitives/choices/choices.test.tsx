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
import type { ChoicesNode } from '.';

const { surfaces, validate } = createIsomerRuntime({ packs: [componentsPack] });
const { Choices, Composition, toComposition } = buildJsxShim(componentsPrimitives);

const options: ChoicesNode['options'] = [
  { label: 'Production', description: 'Live traffic', value: 'production' },
  { label: 'Staging', value: 'staging' },
];

const node = (overrides: Partial<ChoicesNode> = {}): ChoicesNode => ({
  type: 'choices',
  name: 'environment',
  options,
  ...overrides,
});

describe('choices', () => {
  it('takes 1 to 10 options, each with a value Slack can carry', () => {
    const valid = (choices: ChoicesNode) => validate({ type: 'view', body: [choices] }).valid;
    const option = { label: 'a', value: 'a' };

    expect(valid(node())).toBe(true);
    expect(valid(node({ options: [] }))).toBe(false);
    expect(valid(node({ options: Array(11).fill(option) }))).toBe(false);
    expect(valid(node({ options: [{ label: 'a', value: 'x'.repeat(151) }] }))).toBe(false);
    expect(valid(node({ options: [{ label: 'a', value: '' }] }))).toBe(false);
    expect(valid(node({ name: 'not a name' }))).toBe(false);
  });

  it('renders Slack radio buttons in an actions block', () => {
    expect(surfaces.slack.renderNode(node()).blocks).toEqual([
      {
        type: 'actions',
        elements: [
          {
            type: 'radio_buttons',
            action_id: 'environment:0',
            options: [
              {
                text: { type: 'plain_text', text: 'Production', emoji: true },
                description: { type: 'plain_text', text: 'Live traffic', emoji: true },
                value: 'production',
              },
              { text: { type: 'plain_text', text: 'Staging', emoji: true }, value: 'staging' },
            ],
          },
        ],
      },
    ]);
  });

  it('renders Slack checkboxes when several options can be chosen', () => {
    expect(surfaces.slack.renderNode(node({ multiple: true })).blocks).toMatchObject([
      { type: 'actions', elements: [{ type: 'checkboxes', action_id: 'environment:0' }] },
    ]);
  });

  it('renders a numbered list in text and Markdown', () => {
    expect(surfaces.text.renderNode(node())).toBe('1. Production — Live traffic\n2. Staging');
    expect(surfaces.markdown.renderNode(node())).toBe('1. Production — Live traffic\n2. Staging');
  });

  it('adds the fallback in text and Markdown only, where nothing can be chosen', () => {
    const withFallback = node({ fallback: 'Reply with the number of an option.' });

    expect(surfaces.text.renderNode(withFallback)).toBe(
      '1. Production — Live traffic\n2. Staging\nReply with the number of an option.'
    );
    expect(surfaces.markdown.renderNode(withFallback)).toBe(
      '1. Production — Live traffic\n2. Staging\n\nReply with the number of an option.'
    );
    expect(JSON.stringify(surfaces.slack.renderNode(withFallback).blocks)).not.toContain('Reply');
    expect(renderToStaticMarkup(surfaces.react.renderNode(withFallback))).not.toContain('Reply');
  });

  it('renders radio inputs in React, and checkboxes when several can be chosen', () => {
    const single = renderToStaticMarkup(surfaces.react.renderNode(node()));
    const several = renderToStaticMarkup(surfaces.react.renderNode(node({ multiple: true })));

    expect(single).toContain('<input type="radio" name="environment" value="production"/>');
    expect(single).toContain('Live traffic');
    expect(several).toContain('<input type="checkbox" name="environment" value="staging"/>');
  });

  it('is authored from Choices.Option children', () => {
    expect(
      toComposition(
        <Composition>
          <Choices name="environment">
            <Choices.Option value="production" description="Live traffic">
              Production
            </Choices.Option>
            <Choices.Option value="staging">Staging</Choices.Option>
          </Choices>
        </Composition>
      ).body
    ).toEqual([node()]);
  });
});
