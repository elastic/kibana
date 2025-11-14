/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { collapseTrailingRepeats } from './collapse_trailing_repeats';

describe('collapseTrailingRepeats', () => {
  it('should collapse repeated append fields at the end', () => {
    const pattern = '%{timestamp} %{level} %{+body.text} %{+body.text} %{+body.text}';
    const result = collapseTrailingRepeats(pattern);
    expect(result).toBe('%{timestamp} %{level} %{body.text}');
  });

  it('should not collapse with pipe separator (not single spaces)', () => {
    const pattern = '%{timestamp}|%{level}|%{+message}|%{+message}|%{+message}';
    const result = collapseTrailingRepeats(pattern);
    expect(result).toBe('%{timestamp}|%{level}|%{+message}|%{+message}|%{+message}');
  });

  it('should handle pattern with only repeated append fields', () => {
    const pattern = '%{+body.text} %{+body.text} %{+body.text}';
    const result = collapseTrailingRepeats(pattern);
    expect(result).toBe('%{body.text}');
  });

  it('should not strip modifiers if field was not collapsed', () => {
    const pattern = '%{timestamp} %{level} %{+body.text}';
    const result = collapseTrailingRepeats(pattern);
    expect(result).toBe('%{timestamp} %{level} %{+body.text}');
  });

  it('should not collapse or strip modifiers from different append fields', () => {
    const pattern = '%{+field1} %{+field2} %{+field3}';
    const result = collapseTrailingRepeats(pattern);
    expect(result).toBe('%{+field1} %{+field2} %{+field3}');
  });

  it('should not collapse non-append fields', () => {
    const pattern = '%{field1} %{field1} %{field1}';
    const result = collapseTrailingRepeats(pattern);
    expect(result).toBe('%{field1} %{field1} %{field1}');
  });

  it('should handle complex pattern with mixed fields', () => {
    const pattern =
      '%{+timestamp} %{+timestamp} %{host} %{process}[%{pid}]: %{+message} %{+message}';
    const result = collapseTrailingRepeats(pattern);
    expect(result).toBe('%{+timestamp} %{+timestamp} %{host} %{process}[%{pid}]: %{message}');
  });

  it('should handle append fields with modifiers', () => {
    const pattern = '%{field1} %{+body.text->} %{+body.text->} %{+body.text->}';
    const result = collapseTrailingRepeats(pattern);
    expect(result).toBe('%{field1} %{body.text}');
  });

  it('should not collapse if append fields are not at the end', () => {
    const pattern = '%{+field1} %{+field1} %{+field1} %{field2}';
    const result = collapseTrailingRepeats(pattern);
    expect(result).toBe('%{+field1} %{+field1} %{+field1} %{field2}');
  });

  it('should handle empty pattern', () => {
    const pattern = '';
    const result = collapseTrailingRepeats(pattern);
    expect(result).toBe('');
  });

  it('should handle pattern with no fields', () => {
    const pattern = 'literal text only';
    const result = collapseTrailingRepeats(pattern);
    expect(result).toBe('literal text only');
  });

  it('should not collapse with complex delimiters (not single spaces)', () => {
    const pattern = '%{field1} -> %{+message} -> %{+message} -> %{+message}';
    const result = collapseTrailingRepeats(pattern);
    expect(result).toBe('%{field1} -> %{+message} -> %{+message} -> %{+message}');
  });

  it('should handle the real-world example from the issue', () => {
    const pattern =
      '%{+attributes.custom.timestamp} %{+attributes.custom.timestamp} %{+attributes.custom.timestamp} %{attributes.host.hostname} %{attributes.process.name}(%{+attributes.process.title}_%{+attributes.process.title})[%{resource.attributes.process.pid}]: %{} %{+body.text} %{+body.text} %{+body.text} %{+body.text}';
    const result = collapseTrailingRepeats(pattern);
    expect(result).toBe(
      '%{+attributes.custom.timestamp} %{+attributes.custom.timestamp} %{+attributes.custom.timestamp} %{attributes.host.hostname} %{attributes.process.name}(%{+attributes.process.title}_%{+attributes.process.title})[%{resource.attributes.process.pid}]: %{} %{body.text}'
    );
  });

  it('should handle mixed modifiers in trailing repeats', () => {
    const pattern = '%{field1} %{+body.text->} %{+body.text->} %{+body.text->} %{+body.text}';
    const result = collapseTrailingRepeats(pattern);
    expect(result).toBe('%{field1} %{body.text}');
  });
});
