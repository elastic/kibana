/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LABEL_ADJECTIVES,
  LABEL_NOUNS,
  labelFromHash,
  buildConfigLabelRuntimeField,
} from './build_config_label_runtime_field';

describe('LABEL_ADJECTIVES / LABEL_NOUNS', () => {
  it('each list has exactly 256 entries', () => {
    expect(LABEL_ADJECTIVES).toHaveLength(256);
    expect(LABEL_NOUNS).toHaveLength(256);
  });

  it('each list has no duplicate entries', () => {
    expect(new Set(LABEL_ADJECTIVES).size).toBe(256);
    expect(new Set(LABEL_NOUNS).size).toBe(256);
  });

  it('each entry is a non-empty string', () => {
    for (const word of LABEL_ADJECTIVES) {
      expect(typeof word).toBe('string');
      expect(word.length).toBeGreaterThan(0);
    }
    for (const word of LABEL_NOUNS) {
      expect(typeof word).toBe('string');
      expect(word.length).toBeGreaterThan(0);
    }
  });
});

describe('labelFromHash', () => {
  it('returns empty string for empty input', () => {
    expect(labelFromHash('')).toBe('');
  });

  it('returns empty string when input is shorter than 4 hex chars', () => {
    expect(labelFromHash('ab')).toBe('');
    expect(labelFromHash('abc')).toBe('');
  });

  it('returns empty string for non-hex input', () => {
    expect(labelFromHash('zzzz' + '0'.repeat(60))).toBe('');
  });

  it('produces adjective-noun format', () => {
    const label = labelFromHash('aabb' + '0'.repeat(60));
    expect(label).toMatch(/^[a-z]+-[a-z]+$/);
  });

  it('is deterministic — same hash always gives same label', () => {
    const hash = 'aabbccdd' + '0'.repeat(56);
    expect(labelFromHash(hash)).toBe(labelFromHash(hash));
  });

  it('uses only the first two bytes — trailing bytes do not affect the label', () => {
    const base = 'aabb';
    expect(labelFromHash(base + '0'.repeat(60))).toBe(labelFromHash(base + 'f'.repeat(60)));
  });

  it('maps known byte pairs to the correct words', () => {
    // 0x00, 0x00 → LABEL_ADJECTIVES[0], LABEL_NOUNS[0]
    expect(labelFromHash('0000' + '0'.repeat(60))).toBe('able-ant');
    // 0xFF, 0xFF → LABEL_ADJECTIVES[255], LABEL_NOUNS[255]
    expect(labelFromHash('ffff' + '0'.repeat(60))).toBe('twisty-spore');
    // 0xAB → adj[171]='silky', noun[171]='snow'
    expect(labelFromHash('abab' + '0'.repeat(60))).toBe('silky-snow');
  });

  it('changing the first byte changes the adjective', () => {
    const label1 = labelFromHash('00ff' + '0'.repeat(60));
    const label2 = labelFromHash('01ff' + '0'.repeat(60));
    const [adj1] = label1.split('-');
    const [adj2] = label2.split('-');
    expect(adj1).not.toBe(adj2);
  });

  it('changing the second byte changes the noun', () => {
    const label1 = labelFromHash('ff00' + '0'.repeat(60));
    const label2 = labelFromHash('ff01' + '0'.repeat(60));
    const noun1 = label1.split('-')[1];
    const noun2 = label2.split('-')[1];
    expect(noun1).not.toBe(noun2);
  });

  it('accepts a 64-char SHA-256 hex string', () => {
    const sha256 = 'a'.repeat(64);
    expect(labelFromHash(sha256)).not.toBe('');
  });
});

describe('buildConfigLabelRuntimeField', () => {
  it('returns a runtime field for effective_config_label', () => {
    const field = buildConfigLabelRuntimeField();
    expect(field).toHaveProperty('effective_config_label');
    expect(field.effective_config_label.type).toBe('keyword');
    expect(field.effective_config_label.script.lang).toBe('painless');
    expect(typeof field.effective_config_label.script.source).toBe('string');
  });

  it('script source contains the key Painless logic', () => {
    const { source } = buildConfigLabelRuntimeField().effective_config_label.script;
    expect(source).toContain('effective_config_hash');
    expect(source).toContain('Integer.parseInt');
    expect(source).toContain('emit(');
  });

  it('script source embeds all adjectives from LABEL_ADJECTIVES', () => {
    const { source } = buildConfigLabelRuntimeField().effective_config_label.script;
    for (const word of LABEL_ADJECTIVES) {
      expect(source).toContain(`'${word}'`);
    }
  });

  it('script source embeds all nouns from LABEL_NOUNS', () => {
    const { source } = buildConfigLabelRuntimeField().effective_config_label.script;
    for (const word of LABEL_NOUNS) {
      expect(source).toContain(`'${word}'`);
    }
  });

  it('is stable across calls', () => {
    expect(buildConfigLabelRuntimeField()).toEqual(buildConfigLabelRuntimeField());
  });
});
