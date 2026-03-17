/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deserializeCommandBadge } from './command_badge_serializer';
import { serializeEditorContent } from '../serialize';
import { createCommandBadgeElement } from './create_badge_element';
import { CommandId } from '../command_menu/types';

describe('serializeEditorContent', () => {
  it('serializes plain text', () => {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode('hello world'));

    expect(serializeEditorContent(div)).toBe('hello world');
  });

  it('serializes a badge element', () => {
    const div = document.createElement('div');
    const badge = createCommandBadgeElement({
      commandId: CommandId.Skill,
      label: 'Summarize',
      metadata: { 'skill-id': 'skill-1' },
    });
    div.appendChild(badge);

    expect(serializeEditorContent(div)).toBe('[/Summarize](skill://skill-1)');
  });

  it('serializes mixed text and badges', () => {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode('Use '));
    div.appendChild(
      createCommandBadgeElement({
        commandId: CommandId.Skill,
        label: 'Summarize',
        metadata: { 'skill-id': 'skill-1' },
      })
    );
    div.appendChild(document.createTextNode(' to do this'));

    expect(serializeEditorContent(div)).toBe('Use [/Summarize](skill://skill-1) to do this');
  });

  it('serializes multiple badges', () => {
    const div = document.createElement('div');
    div.appendChild(
      createCommandBadgeElement({
        commandId: CommandId.Skill,
        label: 'Summarize',
        metadata: { 'skill-id': 'skill-1' },
      })
    );
    div.appendChild(document.createTextNode(' and '));
    div.appendChild(
      createCommandBadgeElement({
        commandId: CommandId.Skill,
        label: 'Translate',
        metadata: { 'skill-id': 'skill-2' },
      })
    );

    expect(serializeEditorContent(div)).toBe(
      '[/Summarize](skill://skill-1) and [/Translate](skill://skill-2)'
    );
  });
});

describe('deserializeBadgeContent', () => {
  it('returns plain text as a single text segment', () => {
    const segments = deserializeCommandBadge('hello world');

    expect(segments).toEqual([{ type: 'text', value: 'hello world' }]);
  });

  it('parses a badge', () => {
    const segments = deserializeCommandBadge('[/Summarize](skill://skill-1)');

    expect(segments).toEqual([
      {
        type: 'badge',
        data: {
          commandId: CommandId.Skill,
          label: 'Summarize',
          metadata: { 'skill-id': 'skill-1' },
        },
      },
    ]);
  });

  it('parses mixed text and badges', () => {
    const segments = deserializeCommandBadge('Use [/Summarize](skill://skill-1) to do this');

    expect(segments).toEqual([
      { type: 'text', value: 'Use ' },
      {
        type: 'badge',
        data: {
          commandId: CommandId.Skill,
          label: 'Summarize',
          metadata: { 'skill-id': 'skill-1' },
        },
      },
      { type: 'text', value: ' to do this' },
    ]);
  });

  it('returns empty array for empty string', () => {
    expect(deserializeCommandBadge('')).toEqual([]);
  });

  it('preserves unknown schemes as text', () => {
    const segments = deserializeCommandBadge('[/Unknown](unknown://id-1)');

    expect(segments).toEqual([{ type: 'text', value: '[/Unknown](unknown://id-1)' }]);
  });
});

describe('round-trip serialization', () => {
  it('serialize → deserialize → serialize produces same output', () => {
    const original = 'Use [/Summarize](skill://skill-1) to do this';
    const segments = deserializeCommandBadge(original);

    // Rebuild DOM from segments
    const div = document.createElement('div');
    for (const segment of segments) {
      if (segment.type === 'text') {
        div.appendChild(document.createTextNode(segment.value));
      } else {
        div.appendChild(createCommandBadgeElement(segment.data));
      }
    }

    expect(serializeEditorContent(div)).toBe(original);
  });
});
