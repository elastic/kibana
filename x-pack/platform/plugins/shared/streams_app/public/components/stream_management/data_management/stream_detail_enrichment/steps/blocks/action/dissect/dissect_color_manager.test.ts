/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDissectFieldTokens, DissectColorManager } from './dissect_color_manager';

describe('parseDissectFieldTokens', () => {
  it('tracks startIndex and endIndex for each token', () => {
    const tokens = parseDissectFieldTokens('[%{ts}] %{level} - %{msg}');

    expect(tokens).toHaveLength(3);
    expect(tokens[0]).toMatchObject({ fieldName: 'ts', startIndex: 1, endIndex: 6 });
    expect(tokens[1]).toMatchObject({ fieldName: 'level', startIndex: 8, endIndex: 16 });
    expect(tokens[2]).toMatchObject({ fieldName: 'msg', startIndex: 19, endIndex: 25 });
  });

  it('includes skip and reference keys (unlike @kbn/streamlang parseDissectPattern which filters them)', () => {
    const tokens = parseDissectFieldTokens('%{a} %{?skip} %{*ref} %{&ref}');

    expect(tokens).toHaveLength(4);
    expect(tokens[1]).toMatchObject({ fieldName: 'skip', modifier: '?' });
    expect(tokens[2]).toMatchObject({ fieldName: 'ref', modifier: '*' });
    expect(tokens[3]).toMatchObject({ fieldName: 'ref', modifier: '&' });
  });
});

describe('DissectColorManager', () => {
  it('assigns colors deterministically in palette order', () => {
    const manager = new DissectColorManager();
    manager.updatePattern('%{a} %{b} %{c}');
    const map = manager.getFieldColourMap();

    expect(map.get('a')).toBe('Primary');
    expect(map.get('b')).toBe('Accent');
    expect(map.get('c')).toBe('AccentSecondary');
  });

  it('assigns the same color to duplicate field names', () => {
    const manager = new DissectColorManager();
    manager.updatePattern('%{a} %{b} %{a}');
    const map = manager.getFieldColourMap();

    expect(map.size).toBe(2);
    expect(map.get('a')).toBe('Primary');
    expect(map.get('b')).toBe('Accent');
  });

  it('removes colors for fields no longer in the pattern', () => {
    const manager = new DissectColorManager();
    manager.updatePattern('%{a} %{b} %{c}');
    expect(manager.getFieldColourMap().size).toBe(3);

    manager.updatePattern('%{a} %{c}');
    const map = manager.getFieldColourMap();

    expect(map.size).toBe(2);
    expect(map.has('b')).toBe(false);
    expect(map.has('a')).toBe(true);
    expect(map.has('c')).toBe(true);
  });

  it('transfers color when a field is fully replaced at the same position', () => {
    const manager = new DissectColorManager();
    manager.updatePattern('%{a} %{b}');
    const colorA = manager.getFieldColourMap().get('a');

    manager.updatePattern('%{renamed} %{b}');
    const map = manager.getFieldColourMap();

    expect(map.get('renamed')).toBe(colorA);
    expect(map.has('a')).toBe(false);
  });

  it('assigns a new color when renaming one of several duplicate fields', () => {
    const manager = new DissectColorManager();
    manager.updatePattern('%{+ts} %{+ts} %{+ts} %{host}');
    const colorTs = manager.getFieldColourMap().get('ts');
    const colorHost = manager.getFieldColourMap().get('host');

    manager.updatePattern('%{+ts2} %{+ts} %{+ts} %{host}');
    const map = manager.getFieldColourMap();

    expect(map.get('ts')).toBe(colorTs);
    expect(map.get('host')).toBe(colorHost);
    expect(map.get('ts2')).not.toBe(colorTs);
  });

  it('keeps existing colors stable when new fields are added', () => {
    const manager = new DissectColorManager();
    manager.updatePattern('%{a} %{b}');
    const colorA = manager.getFieldColourMap().get('a');
    const colorB = manager.getFieldColourMap().get('b');

    manager.updatePattern('%{a} %{b} %{c}');
    const map = manager.getFieldColourMap();

    expect(map.get('a')).toBe(colorA);
    expect(map.get('b')).toBe(colorB);
    expect(map.has('c')).toBe(true);
  });

  it('cycles through the palette when more fields than colors', () => {
    const manager = new DissectColorManager();
    const fields = Array.from({ length: 10 }, (_, i) => `%{f${i}}`).join(' ');
    manager.updatePattern(fields);
    const map = manager.getFieldColourMap();

    expect(map.size).toBe(10);
    expect(map.get('f0')).toBe(map.get('f8'));
  });

  it('clears all colors when pattern becomes empty', () => {
    const manager = new DissectColorManager();
    manager.updatePattern('%{a} %{b}');
    expect(manager.getFieldColourMap().size).toBe(2);

    manager.updatePattern('');
    expect(manager.getFieldColourMap().size).toBe(0);
  });
});
