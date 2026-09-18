/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deserializeInputSegments } from './command_badge_serializer';
import { serializeEditorContent, encodeImageName } from '../serialize';
import { createCommandBadgeElement } from './create_badge_element';
import { createImagePlaceholderElement } from '../image_placeholder';
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
      id: 'skill-1',
      metadata: {},
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
        id: 'skill-1',
        metadata: {},
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
        id: 'skill-1',
        metadata: {},
      })
    );
    div.appendChild(document.createTextNode(' and '));
    div.appendChild(
      createCommandBadgeElement({
        commandId: CommandId.Skill,
        label: 'Translate',
        id: 'skill-2',
        metadata: {},
      })
    );

    expect(serializeEditorContent(div)).toBe(
      '[/Summarize](skill://skill-1) and [/Translate](skill://skill-2)'
    );
  });

  it('serializes badge with additional metadata as query params', () => {
    const div = document.createElement('div');
    div.appendChild(
      createCommandBadgeElement({
        commandId: CommandId.Skill,
        label: 'Test',
        id: 'skill-1',
        metadata: { type: 'security' },
      })
    );

    expect(serializeEditorContent(div)).toBe('[/Test](skill://skill-1?type=security)');
  });

  it('preserves line breaks from <br> elements', () => {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode('Hi can you tell'));
    div.appendChild(document.createElement('br'));
    div.appendChild(document.createTextNode('me the'));
    div.appendChild(document.createElement('br'));
    div.appendChild(document.createTextNode('wheather ?'));

    expect(serializeEditorContent(div)).toBe('Hi can you tell\nme the\nwheather ?');
  });

  it('preserves line breaks adjacent to badges', () => {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode('Use '));
    div.appendChild(
      createCommandBadgeElement({
        commandId: CommandId.Skill,
        label: 'Summarize',
        id: 'skill-1',
        metadata: {},
      })
    );
    div.appendChild(document.createElement('br'));
    div.appendChild(document.createTextNode('on this'));

    expect(serializeEditorContent(div)).toBe('Use [/Summarize](skill://skill-1)\non this');
  });

  it('serializes an SML badge element', () => {
    const div = document.createElement('div');
    const badge = createCommandBadgeElement({
      commandId: CommandId.Sml,
      label: 'visualization/Pacific Sales',
      id: 'entry-1',
      metadata: {},
    });
    div.appendChild(badge);

    expect(serializeEditorContent(div)).toBe('[@visualization/Pacific Sales](sml://entry-1)');
  });

  it('serializes an image placeholder element', () => {
    const div = document.createElement('div');
    div.appendChild(createImagePlaceholderElement('photo.png'));

    expect(serializeEditorContent(div)).toBe('[photo.png](image://photo.png)');
  });

  it('serializes an image placeholder with special characters in name', () => {
    const div = document.createElement('div');
    div.appendChild(createImagePlaceholderElement('Screenshot (1).png'));

    expect(serializeEditorContent(div)).toBe(
      '[Screenshot (1).png](image://Screenshot%20%281%29.png)'
    );
  });

  it('strips brackets from image display name', () => {
    const div = document.createElement('div');
    div.appendChild(createImagePlaceholderElement('file[1].png'));

    expect(serializeEditorContent(div)).toBe('[file1.png](image://file%5B1%5D.png)');
  });
});

describe('encodeImageName', () => {
  it('encodes spaces', () => {
    expect(encodeImageName('my file.png')).toBe('my%20file.png');
  });

  it('encodes parentheses', () => {
    expect(encodeImageName('Screenshot (1).png')).toBe('Screenshot%20%281%29.png');
  });

  it('leaves normal filenames unchanged', () => {
    expect(encodeImageName('photo.png')).toBe('photo.png');
  });
});

describe('deserializeInputSegments', () => {
  it('returns plain text as a single text segment', () => {
    const segments = deserializeInputSegments('hello world');

    expect(segments).toEqual([{ type: 'text', value: 'hello world' }]);
  });

  it('parses a badge', () => {
    const segments = deserializeInputSegments('[/Summarize](skill://skill-1)');

    expect(segments).toEqual([
      {
        type: 'badge',
        data: {
          commandId: CommandId.Skill,
          label: 'Summarize',
          id: 'skill-1',
          metadata: {},
        },
      },
    ]);
  });

  it('parses mixed text and badges', () => {
    const segments = deserializeInputSegments('Use [/Summarize](skill://skill-1) to do this');

    expect(segments).toEqual([
      { type: 'text', value: 'Use ' },
      {
        type: 'badge',
        data: {
          commandId: CommandId.Skill,
          label: 'Summarize',
          id: 'skill-1',
          metadata: {},
        },
      },
      { type: 'text', value: ' to do this' },
    ]);
  });

  it('returns empty array for empty string', () => {
    expect(deserializeInputSegments('')).toEqual([]);
  });

  it('preserves unknown schemes as text', () => {
    const segments = deserializeInputSegments('[/Unknown](unknown://id-1)');

    expect(segments).toEqual([{ type: 'text', value: '[/Unknown](unknown://id-1)' }]);
  });

  it('parses badge with query params as metadata', () => {
    const segments = deserializeInputSegments(
      '[/Dashboard](skill://dash-1?type=security&view=grid)'
    );

    expect(segments).toEqual([
      {
        type: 'badge',
        data: {
          commandId: CommandId.Skill,
          label: 'Dashboard',
          id: 'dash-1',
          metadata: { type: 'security', view: 'grid' },
        },
      },
    ]);
  });

  it('handles id containing slash characters', () => {
    const segments = deserializeInputSegments('[/My Skill](skill://folder/skill-1)');

    expect(segments).toEqual([
      {
        type: 'badge',
        data: {
          commandId: CommandId.Skill,
          label: 'My Skill',
          id: 'folder/skill-1',
          metadata: {},
        },
      },
    ]);
  });

  it('parses an SML badge', () => {
    const segments = deserializeInputSegments('[@visualization/Pacific Sales](sml://entry-1)');

    expect(segments).toEqual([
      {
        type: 'badge',
        data: {
          commandId: CommandId.Sml,
          label: 'visualization/Pacific Sales',
          id: 'entry-1',
          metadata: {},
        },
      },
    ]);
  });

  it('parses an image segment', () => {
    const segments = deserializeInputSegments('[photo.png](image://photo.png)');

    expect(segments).toEqual([{ type: 'image', name: 'photo.png' }]);
  });

  it('decodes percent-encoded image names', () => {
    const segments = deserializeInputSegments(
      '[Screenshot (1).png](image://Screenshot%20%281%29.png)'
    );

    expect(segments).toEqual([{ type: 'image', name: 'Screenshot (1).png' }]);
  });

  it('preserves an image link with malformed percent-encoding as text', () => {
    const segments = deserializeInputSegments('[x](image://bad%.png)');

    expect(segments).toEqual([{ type: 'text', value: '[x](image://bad%.png)' }]);
  });

  it('parses image segment mixed with text', () => {
    const segments = deserializeInputSegments('See [photo.png](image://photo.png) here');

    expect(segments).toEqual([
      { type: 'text', value: 'See ' },
      { type: 'image', name: 'photo.png' },
      { type: 'text', value: ' here' },
    ]);
  });
});

describe('round-trip serialization', () => {
  it('serialize → deserialize → serialize produces same output', () => {
    const original = 'Use [/Summarize](skill://skill-1) to do this';
    const segments = deserializeInputSegments(original);

    // Rebuild DOM from segments
    const div = document.createElement('div');
    for (const segment of segments) {
      if (segment.type === 'text') {
        div.appendChild(document.createTextNode(segment.value));
      } else if (segment.type === 'badge') {
        div.appendChild(createCommandBadgeElement(segment.data));
      }
    }

    expect(serializeEditorContent(div)).toBe(original);
  });

  it('round-trips badge with additional metadata', () => {
    const original = '[/Test](skill://skill-1?type=security)';
    const segments = deserializeInputSegments(original);

    const div = document.createElement('div');
    for (const segment of segments) {
      if (segment.type === 'text') {
        div.appendChild(document.createTextNode(segment.value));
      } else if (segment.type === 'badge') {
        div.appendChild(createCommandBadgeElement(segment.data));
      }
    }

    expect(serializeEditorContent(div)).toBe(original);
  });

  it('round-trips SML badge', () => {
    const original = 'Ref [@visualization/Pacific Sales](sml://entry-1) here';
    const segments = deserializeInputSegments(original);

    const div = document.createElement('div');
    for (const segment of segments) {
      if (segment.type === 'text') {
        div.appendChild(document.createTextNode(segment.value));
      } else if (segment.type === 'badge') {
        div.appendChild(createCommandBadgeElement(segment.data));
      }
    }

    expect(serializeEditorContent(div)).toBe(original);
  });
});
