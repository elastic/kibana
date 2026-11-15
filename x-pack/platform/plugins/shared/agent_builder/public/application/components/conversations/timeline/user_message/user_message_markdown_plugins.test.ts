/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALLOWED_LINK_PROTOCOLS,
  COMMAND_SCHEMES,
  parseSchemeAndPath,
  decodeBadgeName,
  escapeCommandBadgeLabels,
} from './user_message_markdown_plugins';

describe('ALLOWED_LINK_PROTOCOLS', () => {
  it('allows the standard web protocols', () => {
    expect(ALLOWED_LINK_PROTOCOLS).toEqual(expect.arrayContaining(['https:', 'http:', 'mailto:']));
  });

  it('allows every command scheme plus the image scheme', () => {
    expect(ALLOWED_LINK_PROTOCOLS).toEqual(expect.arrayContaining(['skill:', 'sml:', 'image:']));
  });
});

describe('COMMAND_SCHEMES', () => {
  it('contains the known command schemes', () => {
    expect(COMMAND_SCHEMES.has('skill')).toBe(true);
    expect(COMMAND_SCHEMES.has('sml')).toBe(true);
  });

  it('does not contain the image scheme (handled separately from commands)', () => {
    expect(COMMAND_SCHEMES.has('image')).toBe(false);
  });
});

describe('parseSchemeAndPath', () => {
  it('parses a scheme and path', () => {
    expect(parseSchemeAndPath('skill://skill-1')).toEqual({ scheme: 'skill', path: 'skill-1' });
  });

  it('strips a trailing query string from the path', () => {
    expect(parseSchemeAndPath('sml://entry-1?key=value')).toEqual({
      scheme: 'sml',
      path: 'entry-1',
    });
  });

  it('keeps percent-encoding in the path as-is (decoding is a separate step)', () => {
    expect(parseSchemeAndPath('image://Screenshot%20%281%29.png')).toEqual({
      scheme: 'image',
      path: 'Screenshot%20%281%29.png',
    });
  });

  it('parses plain http(s) URLs the same way — the caller decides what to do with the scheme', () => {
    expect(parseSchemeAndPath('https://www.elastic.co')).toEqual({
      scheme: 'https',
      path: 'www.elastic.co',
    });
  });

  it('returns undefined for a string with no scheme', () => {
    expect(parseSchemeAndPath('not-a-url')).toBeUndefined();
  });

  it('returns undefined for an empty string', () => {
    expect(parseSchemeAndPath('')).toBeUndefined();
  });
});

describe('decodeBadgeName', () => {
  it('decodes a percent-encoded name', () => {
    expect(decodeBadgeName('Screenshot%20%281%29.png')).toBe('Screenshot (1).png');
  });

  it('returns plain names unchanged', () => {
    expect(decodeBadgeName('photo.png')).toBe('photo.png');
  });

  it('falls back to the raw path on malformed percent-encoding', () => {
    expect(decodeBadgeName('%E0%A4%A')).toBe('%E0%A4%A');
  });
});

describe('escapeCommandBadgeLabels', () => {
  it('escapes markdown syntax in command badge labels', () => {
    expect(escapeCommandBadgeLabels('[@dashboard/logs-*,metrics-*](sml://entry-1)')).toBe(
      '[@dashboard/logs\\-\\*,metrics\\-\\*](sml://entry-1)'
    );
  });

  it('keeps the href of command badges unchanged', () => {
    expect(escapeCommandBadgeLabels('[/my_skill](skill://skill-1?key=a_b)')).toBe(
      '[/my\\_skill](skill://skill-1?key=a_b)'
    );
  });

  it('leaves image badges and regular links unchanged', () => {
    const text = '[my_*photo*.png](image://photo.png) and [*Elastic*](https://www.elastic.co)';

    expect(escapeCommandBadgeLabels(text)).toBe(text);
  });

  it('leaves text outside badges unchanged', () => {
    expect(escapeCommandBadgeLabels('Use *this* [/Summarize](skill://skill-1) **now**')).toBe(
      'Use *this* [/Summarize](skill://skill-1) **now**'
    );
  });
});
