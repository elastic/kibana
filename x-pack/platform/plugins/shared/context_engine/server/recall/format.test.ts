/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import type {
  AiIndexRecallResult,
  RecallResult,
  SessionEventRecallResult,
  SessionMemoryRecallResult,
} from '../../common/http_api/recall';
import {
  formatRecallYaml,
  normalizeRecallResult,
  recallContainerChars,
  serializedRecallItemChars,
} from './format';

const event: SessionEventRecallResult = {
  id: 'evt-1',
  session_id: 'sess-1',
  source: 'session_events',
  date: '2026-11-20T10:00:00.000Z',
  role: 'user',
  content: 'How do I rotate the API key?',
};

const memory: SessionMemoryRecallResult = {
  id: 'mem-1',
  session_id: 'sess-1',
  source: 'session_memory',
  date: '2026-11-21T10:00:00.000Z',
  content: 'The user prefers Terraform.',
  attributes: { topic: 'infra' },
};

const ki: AiIndexRecallResult = {
  id: 'ki-1',
  source: 'ai_index:runbooks',
  date: '2026-11-22T10:00:00.000Z',
  content: 'Rotate keys monthly.',
  attributes: { priority: 2, owner: 'sre', tags: ['security', 'keys'], meta: { reviewed: true } },
};

const parseResults = (yaml: string): unknown => parse(yaml).results;

describe('formatRecallYaml', () => {
  it('roundtrips every result variant', () => {
    expect(parseResults(formatRecallYaml([event, memory, ki]))).toEqual([event, memory, ki]);
  });

  it('writes fields in canonical order regardless of input order', () => {
    const shuffled = {
      content: event.content,
      role: event.role,
      date: event.date,
      source: event.source,
      session_id: event.session_id,
      id: event.id,
    } as const;
    expect(formatRecallYaml([shuffled])).toBe(formatRecallYaml([event]));
    expect(Object.keys(normalizeRecallResult(shuffled))).toEqual([
      'id',
      'session_id',
      'source',
      'date',
      'role',
      'content',
    ]);
  });

  it('keeps multiline Markdown verbatim as a block scalar', () => {
    const content = '# Runbook\n\n- step one\n- step two\n\n```sh\nkubectl get pods\n```';
    const yaml = formatRecallYaml([{ ...ki, content }]);
    expect(yaml).toMatch(/content: \|-?\n/);
    expect(yaml).toContain('      # Runbook\n');
    expect(parse(yaml).results[0].content).toBe(content);
  });

  it.each([
    ['leading bold', '**bold** start'],
    ['colons', 'key: value: other'],
    ['document marker', '---'],
    ['leading dash', '- not a list'],
    ['hash', '# heading'],
  ])('roundtrips YAML-special content (%s)', (_label, content) => {
    expect(parse(formatRecallYaml([{ ...event, content }])).results[0].content).toBe(content);
  });

  it('does not hard-wrap long lines', () => {
    const content = Array.from({ length: 40 }, (_, i) => `word${i}`).join(' ');
    const yaml = formatRecallYaml([{ ...event, content }]);
    expect(yaml.split('\n').some((line) => line.includes(content))).toBe(true);
  });

  it('omits empty attributes and keeps non-empty ones', () => {
    const yaml = formatRecallYaml([{ ...memory, attributes: {} }, { ...ki, attributes: {} }, ki]);
    const [parsedMemory, parsedEmptyKi, parsedKi] = parse(yaml).results;
    expect(parsedMemory).not.toHaveProperty('attributes');
    expect(parsedEmptyKi).not.toHaveProperty('attributes');
    expect(parsedKi.attributes).toEqual(ki.attributes);
  });

  it('writes no anchors or aliases for shared attribute objects', () => {
    const shared = { team: 'sre', nested: { level: 1 } };
    const yaml = formatRecallYaml([
      { ...ki, id: 'ki-1', attributes: shared },
      { ...ki, id: 'ki-2', attributes: shared },
    ]);
    expect(yaml).not.toMatch(/[&*]\w/);
    expect(parse(yaml).results[1].attributes).toEqual(shared);
  });

  it('formats no results as an empty list', () => {
    expect(formatRecallYaml([])).toBe('results: []\n');
  });

  it('omits date on an AI index result without one', () => {
    const [parsed] = parse(formatRecallYaml([{ ...ki, date: undefined }])).results;
    expect(parsed).not.toHaveProperty('date');
    expect(parsed.content).toBe(ki.content);
  });
});

describe('serializedRecallItemChars', () => {
  const results: RecallResult[] = [event, normalizeRecallResult({ ...memory, attributes: {} }), ki];

  it('sums with YAML container overhead to the exact formatRecallYaml length', () => {
    const { wrapper, separator } = recallContainerChars.yaml;
    const total =
      wrapper +
      results.reduce((sum, result) => sum + serializedRecallItemChars(result, 'yaml'), 0) +
      separator * (results.length - 1);
    expect(total).toBe(formatRecallYaml(results).length);
  });

  it('sums with JSON container overhead to the exact JSON.stringify length', () => {
    const { wrapper, separator } = recallContainerChars.json;
    const total =
      wrapper +
      results.reduce((sum, result) => sum + serializedRecallItemChars(result, 'json'), 0) +
      separator * (results.length - 1);
    expect(total).toBe(JSON.stringify(results).length);
  });
});
