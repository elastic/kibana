/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangProcessorDefinitionWithUIAttributes } from '@kbn/streamlang';
import { getStepDescription } from './utils';

const asStep = (step: Partial<StreamlangProcessorDefinitionWithUIAttributes>) =>
  step as StreamlangProcessorDefinitionWithUIAttributes;

describe('getStepDescription', () => {
  it('returns custom description when provided', () => {
    const step = asStep({
      action: 'set',
      to: 'field',
      value: 'bar',
      description: 'Custom description',
    });

    expect(getStepDescription(step)).toBe('Custom description');
  });

  it('returns description as-is with whitespace trimmed', () => {
    const step = asStep({
      action: 'set',
      to: 'field',
      value: 'bar',
      description: '  Trimmed description  ',
    });

    expect(getStepDescription(step)).toBe('  Trimmed description  ');
  });

  it('falls back to auto description when description is missing', () => {
    const step = asStep({
      action: 'set',
      to: 'field',
      value: 'bar',
    });

    expect(getStepDescription(step)).toBe('Sets value of "field" to "bar"');
  });

  it('generates description for grok processor', () => {
    const step = asStep({
      action: 'grok',
      from: 'message',
      patterns: ['%{COMMONAPACHELOG}'],
    });

    expect(getStepDescription(step)).toBe('%{COMMONAPACHELOG}');
  });

  it('generates description for dissect processor', () => {
    const step = asStep({
      action: 'dissect',
      from: 'message',
      pattern: '%{timestamp} %{log.level}',
    });

    expect(getStepDescription(step)).toBe('%{timestamp} %{log.level}');
  });

  it('generates description for date processor', () => {
    const step = asStep({
      action: 'date',
      from: 'timestamp',
      formats: ['ISO8601', 'UNIX'],
    });

    expect(getStepDescription(step)).toBe('timestamp • ISO8601 - UNIX');
  });

  it('generates description for set processor with copy_from', () => {
    const step = asStep({
      action: 'set',
      to: 'log.level',
      copy_from: 'severity',
    });

    expect(getStepDescription(step)).toBe('Sets value of "log.level" to value of "severity"');
  });

  it('generates description for set processor with value', () => {
    const step = asStep({
      action: 'set',
      to: 'log.level',
      value: 'ERROR',
    });

    expect(getStepDescription(step)).toBe('Sets value of "log.level" to "ERROR"');
  });

  it('generates description for rename processor', () => {
    const step = asStep({
      action: 'rename',
      from: 'old_field',
      to: 'new_field',
    });

    expect(getStepDescription(step)).toBe('Renames "old_field" to "new_field"');
  });

  it('generates description for append processor', () => {
    const step = asStep({
      action: 'append',
      to: 'tags',
      value: ['production'],
    });

    expect(getStepDescription(step)).toBe('Appends ["production"] to "tags"');
  });

  it('generates description for convert processor with target', () => {
    const step = asStep({
      action: 'convert',
      from: 'bytes',
      to: 'bytes_number',
      type: 'long',
    });

    expect(getStepDescription(step)).toBe(
      'Converts "bytes" field value to "long" type and stores it in "bytes_number" field'
    );
  });

  it('generates description for convert processor without target', () => {
    const step = asStep({
      action: 'convert',
      from: 'bytes',
      type: 'long',
    });

    expect(getStepDescription(step)).toBe('Converts "bytes" field value to "long" type');
  });

  it('generates description for remove_by_prefix processor', () => {
    const step = asStep({
      action: 'remove_by_prefix',
      from: 'labels',
    });

    expect(getStepDescription(step)).toBe('Removes labels and all nested fields');
  });

  it('generates description for remove processor', () => {
    const step = asStep({
      action: 'remove',
      from: 'labels',
    });

    expect(getStepDescription(step)).toBe('Removes labels');
  });
});
