/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Import the new function along with the old one
import { replaceSemanticNames } from './parser';

// ... keep existing describe block for parseSemanticNames ...

describe('replaceSemanticNames', () => {
  const prefixReplacer = (name: string) => `pre_${name}`;
  const suffixReplacer = (name: string) => `${name}_suf`;
  const conditionalReplacer = (name: string) => (name === 'level' ? 'log_level' : name);
  const mapReplacer = (map: Map<string, string>) => (name: string) => map.get(name) ?? name; // Return original if not in map

  test('should return original string if no names present', () => {
    const pattern = '%{IP} - %{USER} \\[%{HTTPDATE}\\]';
    expect(replaceSemanticNames(pattern, prefixReplacer)).toBe(pattern);
  });

  test('should replace names in simple grok patterns', () => {
    const pattern = '%{IP:client_ip} %{WORD:method}';
    const expected = '%{IP:pre_client_ip} %{WORD:pre_method}';
    expect(replaceSemanticNames(pattern, prefixReplacer)).toBe(expected);
  });

  test('should replace names in grok patterns with types', () => {
    const pattern = '%{NUMBER:bytes:int} Cost is %{NUMBER:cost:float}';
    const expected = '%{NUMBER:bytes_suf:int} Cost is %{NUMBER:cost_suf:float}';
    expect(replaceSemanticNames(pattern, suffixReplacer)).toBe(expected);
  });

  test('should replace names in named capture groups', () => {
    const pattern = '(?<timestamp>\\d+) \\| (?<message>.*)';
    const expected = '(?<pre_timestamp>\\d+) \\| (?<pre_message>.*)';
    expect(replaceSemanticNames(pattern, prefixReplacer)).toBe(expected);
  });

  test('should replace names in mixed grok and named capture groups', () => {
    const pattern =
      '%{TIMESTAMP_ISO8601:timestamp} \\[%{LOGLEVEL:level}\\] (?<thread>.*?) - (?<msg>.*)';
    const expected =
      '%{TIMESTAMP_ISO8601:log_timestamp} \\[%{LOGLEVEL:log_level}\\] (?<log_thread>.*?) - (?<log_msg>.*)';
    const replacementMap = new Map([
      ['timestamp', 'log_timestamp'],
      ['level', 'log_level'],
      ['thread', 'log_thread'],
      ['msg', 'log_msg'],
    ]);
    expect(replaceSemanticNames(pattern, mapReplacer(replacementMap))).toBe(expected);
  });

  test('should handle conditional replacement', () => {
    const pattern = '%{IP:client_ip} %{LOGLEVEL:level} %{WORD:method}';
    const expected = '%{IP:client_ip} %{LOGLEVEL:log_level} %{WORD:method}';
    expect(replaceSemanticNames(pattern, conditionalReplacer)).toBe(expected);
  });

  test('should replace multiple occurrences of the same name', () => {
    const pattern = '%{IP:address} is accessing %{HOSTNAME:address} using %{WORD:method}';
    const expected =
      '%{IP:pre_address} is accessing %{HOSTNAME:pre_address} using %{WORD:pre_method}';
    expect(replaceSemanticNames(pattern, prefixReplacer)).toBe(expected);
  });

  test('should handle adjacent patterns correctly', () => {
    const pattern = '%{WORD:key}:%{NUMBER:value:int}';
    const expected = '%{WORD:pre_key}:%{NUMBER:pre_value:int}';
    expect(replaceSemanticNames(pattern, prefixReplacer)).toBe(expected);
  });

  test('should not change patterns without semantic names to replace', () => {
    const pattern = '%{IP} %{WORD}';
    const expected = '%{IP} %{WORD}';
    expect(replaceSemanticNames(pattern, prefixReplacer)).toBe(expected);
  });
});
