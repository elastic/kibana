/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDissectProcessorWithReview } from './get_dissect_processor_with_review';
import { collapseRepeats } from './collapse_repeats';
import { serializeAST } from '../serialize_ast';
import type { DissectPattern, DissectAST } from '../types';
import type { NormalizedReviewResult } from './get_review_fields';

// Helper to parse a pattern string into AST
function parsePattern(patternString: string): DissectAST {
  const nodes: DissectAST['nodes'] = [];
  const regex = /%\{([^}]+)\}|([^%]+)/g;
  let match;

  while ((match = regex.exec(patternString)) !== null) {
    if (match[1]) {
      // Field node
      const fieldContent = match[1];
      const modifiers: any = {};
      let fieldName = fieldContent;

      // Parse modifiers
      if (fieldContent.startsWith('+')) {
        modifiers.append = true;
        fieldName = fieldContent.slice(1);
      }
      if (fieldContent.startsWith('?')) {
        modifiers.skip = true;
        modifiers.namedSkip = true;
        fieldName = fieldContent.slice(1);
      }
      if (fieldContent.endsWith('->')) {
        modifiers.rightPadding = true;
        fieldName = fieldName.slice(0, -2);
      }
      if (fieldName === '') {
        modifiers.skip = true;
      }

      nodes.push({
        type: 'field',
        name: fieldName,
        modifiers: Object.keys(modifiers).length > 0 ? modifiers : undefined,
      });
    } else if (match[2]) {
      // Literal node
      nodes.push({
        type: 'literal',
        value: match[2],
      });
    }
  }

  return { nodes };
}

describe('getDissectProcessorWithReview', () => {
  it('replaces field names with ECS names', () => {
    const pattern: DissectPattern = {
      ast: parsePattern('%{field_1} %{field_2} %{field_3}'),
      fields: [
        {
          name: 'field_1',
          values: ['192.168.1.1', '10.0.0.1'],
          position: 0,
        },
        {
          name: 'field_2',
          values: ['GET', 'POST'],
          position: 1,
        },
        {
          name: 'field_3',
          values: ['200', '404'],
          position: 2,
        },
      ],
    };

    const reviewResult: NormalizedReviewResult = {
      log_source: 'Apache HTTP Server Log',
      fields: [
        {
          ecs_field: 'source.ip',
          columns: ['field_1'],
        },
        {
          ecs_field: 'http.request.method',
          columns: ['field_2'],
        },
        {
          ecs_field: 'http.response.status_code',
          columns: ['field_3'],
        },
      ],
    };

    const result = getDissectProcessorWithReview(pattern, reviewResult);

    expect(result.pattern).toBe('%{source.ip} %{http.request.method} %{http.response.status_code}');
    expect(result.description).toBe('Apache HTTP Server Log');
    expect(result.processor.dissect.pattern).toBe(
      '%{source.ip} %{http.request.method} %{http.response.status_code}'
    );
  });

  it('groups adjacent fields into single field using append strategy', () => {
    const pattern: DissectPattern = {
      ast: parsePattern('%{field_1}-%{field_2}-%{field_3} %{field_4}'),
      fields: [
        {
          name: 'field_1',
          values: ['2024', '2024'],
          position: 0,
        },
        {
          name: 'field_2',
          values: ['01', '02'],
          position: 1,
        },
        {
          name: 'field_3',
          values: ['15', '16'],
          position: 2,
        },
        {
          name: 'field_4',
          values: ['INFO', 'ERROR'],
          position: 3,
        },
      ],
    };

    const reviewResult: NormalizedReviewResult = {
      log_source: 'Application Log',
      fields: [
        {
          ecs_field: '@timestamp',
          columns: ['field_1', 'field_2', 'field_3'],
        },
        {
          ecs_field: 'log.level',
          columns: ['field_4'],
        },
      ],
    };

    const result = getDissectProcessorWithReview(pattern, reviewResult);

    // Multiple fields mapped to same ECS field with append all get +modifier
    // Collapse logic removes consecutive identical append fields
    expect(result.pattern).toBe('%{@timestamp} %{log.level}');
    expect(result.metadata.fieldCount).toBe(2);
    expect(result.processor.dissect.append_separator).toBe(' ');
  });

  it('groups adjacent fields using append strategy', () => {
    const pattern: DissectPattern = {
      ast: parsePattern('%{field_1} %{field_2} %{field_3}'),
      fields: [
        {
          name: 'field_1',
          values: ['2024-01-15', '2024-02-16'],
          position: 0,
        },
        {
          name: 'field_2',
          values: ['10:30:45', '11:45:30'],
          position: 1,
        },
        {
          name: 'field_3',
          values: ['INFO', 'ERROR'],
          position: 2,
        },
      ],
    };

    const reviewResult: NormalizedReviewResult = {
      log_source: 'Application Log',
      fields: [
        {
          ecs_field: '@timestamp',
          columns: ['field_1', 'field_2'],
        },
        {
          ecs_field: 'log.level',
          columns: ['field_3'],
        },
      ],
    };

    const result = getDissectProcessorWithReview(pattern, reviewResult);

    expect(result.pattern).toBe('%{@timestamp} %{log.level}');
    expect(result.processor.dissect.append_separator).toBe(' ');
    expect(result.metadata.fieldCount).toBe(2);
  });

  it('preserves modifiers when using append strategy', () => {
    const pattern: DissectPattern = {
      ast: parsePattern('%{field_1->} %{field_2} %{field_3}'),
      fields: [
        {
          name: 'field_1',
          values: ['John', 'Jane'],
          position: 0,
          modifiers: { rightPadding: true },
        },
        {
          name: 'field_2',
          values: ['Doe', 'Smith'],
          position: 1,
        },
        {
          name: 'field_3',
          values: ['INFO', 'ERROR'],
          position: 2,
        },
      ],
    };

    const reviewResult: NormalizedReviewResult = {
      log_source: 'System Log',
      fields: [
        {
          ecs_field: 'user.full_name',
          columns: ['field_1', 'field_2'],
        },
        {
          ecs_field: 'log.level',
          columns: ['field_3'],
        },
      ],
    };

    const result = getDissectProcessorWithReview(pattern, reviewResult);

    expect(result.pattern).toBe('%{user.full_name->} %{log.level}');
    expect(result.processor.dissect.append_separator).toBe(' ');
  });

  it('handles multi-column append fields', () => {
    const pattern: DissectPattern = {
      ast: parsePattern('%{field_1} %{field_2} [%{field_3}] %{field_4}'),
      fields: [
        {
          name: 'field_1',
          values: ['2024-01-15', '2024-02-16'],
          position: 0,
        },
        {
          name: 'field_2',
          values: ['10:30:45', '11:45:30'],
          position: 1,
        },
        {
          name: 'field_3',
          values: ['INFO', 'ERROR'],
          position: 2,
        },
        {
          name: 'field_4',
          values: ['message1', 'message2'],
          position: 3,
        },
      ],
    };

    const reviewResult: NormalizedReviewResult = {
      log_source: 'Application Log',
      fields: [
        {
          ecs_field: '@timestamp',
          columns: ['field_1', 'field_2'],
        },
        {
          ecs_field: 'log.level',
          columns: ['field_3'],
        },
        {
          ecs_field: 'message',
          columns: ['field_4'],
        },
      ],
    };

    const result = getDissectProcessorWithReview(pattern, reviewResult);

    // The collapse logic removes consecutive repeated append fields AND their delimiters
    expect(result.pattern).toBe('%{@timestamp} [%{log.level}] %{message}');
    expect(result.processor.dissect.append_separator).toBe(' ');
  });

  it('preserves modifiers when renaming fields', () => {
    const pattern: DissectPattern = {
      ast: parsePattern('%{field_1->} %{field_2}'),
      fields: [
        {
          name: 'field_1',
          values: ['INFO', 'ERROR'],
          position: 0,
          modifiers: { rightPadding: true },
        },
        {
          name: 'field_2',
          values: ['message1', 'message2'],
          position: 1,
        },
      ],
    };

    const reviewResult: NormalizedReviewResult = {
      log_source: 'System Log',
      fields: [
        {
          ecs_field: 'log.level',
          columns: ['field_1'],
        },
        {
          ecs_field: 'message',
          columns: ['field_2'],
        },
      ],
    };

    const result = getDissectProcessorWithReview(pattern, reviewResult);

    expect(result.pattern).toBe('%{log.level->} %{message}');
  });

  it('converts unmapped fields to skip fields %{?}', () => {
    const pattern: DissectPattern = {
      ast: parsePattern('%{field_1} %{field_2} %{field_3}'),
      fields: [
        {
          name: 'field_1',
          values: ['value1'],
          position: 0,
        },
        {
          name: 'field_2',
          values: ['value2'],
          position: 1,
        },
        {
          name: 'field_3',
          values: ['value3'],
          position: 2,
        },
      ],
    };

    const reviewResult: NormalizedReviewResult = {
      log_source: 'Unknown Log',
      fields: [
        {
          ecs_field: 'custom.field',
          columns: ['field_1'],
        },
        // field_2 and field_3 not mapped
      ],
    };

    const result = getDissectProcessorWithReview(pattern, reviewResult);

    // field_2 and field_3 should be converted to skip fields
    // Consecutive skip fields collapse to one
    expect(result.pattern).toBe('%{custom.field} %{?}');
  });

  it('collapses trailing repeated append fields', () => {
    const pattern: DissectPattern = {
      ast: parsePattern('%{field_1} %{field_2} %{field_3} %{field_4} %{field_5}'),
      fields: [
        {
          name: 'field_1',
          values: ['INFO'],
          position: 0,
        },
        {
          name: 'field_2',
          values: ['word1'],
          position: 1,
        },
        {
          name: 'field_3',
          values: ['word2'],
          position: 2,
        },
        {
          name: 'field_4',
          values: ['word3'],
          position: 3,
        },
        {
          name: 'field_5',
          values: ['word4'],
          position: 4,
        },
      ],
    };

    const reviewResult: NormalizedReviewResult = {
      log_source: 'Application Log',
      fields: [
        {
          ecs_field: 'log.level',
          columns: ['field_1'],
        },
        {
          ecs_field: 'message',
          columns: ['field_2', 'field_3', 'field_4', 'field_5'],
        },
      ],
    };

    const result = getDissectProcessorWithReview(pattern, reviewResult);

    expect(result.pattern).toBe('%{log.level} %{message}');
    expect(result.processor.dissect.append_separator).toBe(' ');
  });

  it('collapses repeated append field with following different delimiter', () => {
    const patternString =
      '%{+attributes.custom.timestamp} %{+attributes.custom.timestamp}, %{severity_text->} %{resource.attributes.service.name->} %{body.text}';
    const ast = parsePattern(patternString);
    const collapsed = collapseRepeats(ast);
    const serialized = serializeAST(collapsed);
    // After collapse we expect a single timestamp field (append removed) followed by comma
    expect(serialized).toBe(
      '%{attributes.custom.timestamp}, %{severity_text->} %{resource.attributes.service.name->} %{body.text}'
    );
  });

  it('handles triple timestamp append fields and host name pair collapse', () => {
    const patternString =
      '%{+attributes.custom.timestamp} %{+attributes.custom.timestamp} %{+attributes.custom.timestamp} %{+resource.attributes.host.name}-%{+resource.attributes.host.name->} %{attributes.process.name} %{body.text}';
    const ast = parsePattern(patternString);
    const collapsed = collapseRepeats(ast);
    const serialized = serializeAST(collapsed);
    // Expect host name pair collapsed, timestamps untouched (no differing following delimiter)
    expect(serialized).toBe(
      '%{+attributes.custom.timestamp} %{+attributes.custom.timestamp} %{+attributes.custom.timestamp} %{resource.attributes.host.name} %{attributes.process.name} %{body.text}'
    );
  });

  it('collapses trailing repeated body.text fields with mixed delimiters', () => {
    const patternString =
      '%{+attributes.custom.timestamp} %{+attributes.custom.timestamp}, %{severity_text->} %{attributes.log.logger->} %{+body.text}: %{+body.text}\\%{+body.text}_%{+body.text}_%{+body.text}_%{+body.text}_%{?}_%{+body.text}';
    const ast = parsePattern(patternString);
    const collapsed = collapseRepeats(ast);
    const serialized = serializeAST(collapsed);
    // Should collapse trailing timestamp fields AND trailing body.text fields
    expect(serialized).toBe(
      '%{attributes.custom.timestamp}, %{severity_text->} %{attributes.log.logger->} %{body.text}'
    );
  });

  it('collapses repeated fields with skip fields in between', () => {
    const patternString = '%{body.text} %{body.text} %{?} %{body.text}, %{other.field}';
    const ast = parsePattern(patternString);
    const collapsed = collapseRepeats(ast);
    const serialized = serializeAST(collapsed);
    // Should collapse the entire sequence: body.text, body.text, skip, body.text -> body.text
    expect(serialized).toBe('%{body.text}, %{other.field}');
  });
});
