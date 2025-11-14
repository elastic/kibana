/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDissectProcessorWithReview } from './get_dissect_processor_with_review';
import type { DissectPattern } from '../types';
import type { NormalizedReviewResult } from './get_review_fields';

describe('getDissectProcessorWithReview', () => {
  it('replaces field names with ECS names', () => {
    const pattern: DissectPattern = {
      pattern: '%{field_1} %{field_2} %{field_3}',
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
          join_strategy: 'skip',
        },
        {
          ecs_field: 'http.request.method',
          columns: ['field_2'],
          join_strategy: 'skip',
        },
        {
          ecs_field: 'http.response.status_code',
          columns: ['field_3'],
          join_strategy: 'skip',
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

  it('groups adjacent fields into single field using skip strategy (default)', () => {
    const pattern: DissectPattern = {
      pattern: '%{field_1}-%{field_2}-%{field_3} %{field_4}',
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
          join_strategy: 'skip',
        },
        {
          ecs_field: 'log.level',
          columns: ['field_4'],
          join_strategy: 'skip',
        },
      ],
    };

    const result = getDissectProcessorWithReview(pattern, reviewResult);

    expect(result.pattern).toBe('%{@timestamp}-%{}-%{} %{log.level}');
    expect(result.metadata.fieldCount).toBe(2);
    expect(result.processor.dissect.append_separator).toBeUndefined();
  });

  it('groups adjacent fields using append strategy', () => {
    const pattern: DissectPattern = {
      pattern: '%{field_1} %{field_2} %{field_3}',
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
          join_strategy: 'append',
        },
        {
          ecs_field: 'log.level',
          columns: ['field_3'],
          join_strategy: 'skip',
        },
      ],
    };

    const result = getDissectProcessorWithReview(pattern, reviewResult);

    expect(result.pattern).toBe('%{+@timestamp} %{+@timestamp} %{log.level}');
    expect(result.processor.dissect.append_separator).toBe(' ');
    expect(result.metadata.fieldCount).toBe(2);
  });

  it('preserves modifiers when using append strategy', () => {
    const pattern: DissectPattern = {
      pattern: '%{field_1->} %{field_2} %{field_3}',
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
          join_strategy: 'append',
        },
        {
          ecs_field: 'log.level',
          columns: ['field_3'],
          join_strategy: 'skip',
        },
      ],
    };

    const result = getDissectProcessorWithReview(pattern, reviewResult);

    expect(result.pattern).toBe('%{+user.full_name->} %{+user.full_name} %{log.level}');
    expect(result.processor.dissect.append_separator).toBe(' ');
  });

  it('handles mixed append and skip strategies', () => {
    const pattern: DissectPattern = {
      pattern: '%{field_1} %{field_2} [%{field_3}] %{field_4}',
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
          join_strategy: 'append',
        },
        {
          ecs_field: 'log.level',
          columns: ['field_3'],
          join_strategy: 'skip',
        },
        {
          ecs_field: 'message',
          columns: ['field_4'],
          join_strategy: 'skip',
        },
      ],
    };

    const result = getDissectProcessorWithReview(pattern, reviewResult);

    expect(result.pattern).toBe('%{+@timestamp} %{+@timestamp} [%{log.level}] %{message}');
    expect(result.processor.dissect.append_separator).toBe(' ');
  });

  it('preserves modifiers when renaming fields', () => {
    const pattern: DissectPattern = {
      pattern: '%{field_1->} %{field_2}',
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
          join_strategy: 'skip',
        },
        {
          ecs_field: 'message',
          columns: ['field_2'],
          join_strategy: 'skip',
        },
      ],
    };

    const result = getDissectProcessorWithReview(pattern, reviewResult);

    expect(result.pattern).toBe('%{log.level->} %{message}');
  });

  it('keeps unmapped fields as-is', () => {
    const pattern: DissectPattern = {
      pattern: '%{field_1} %{field_2} %{field_3}',
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
          join_strategy: 'skip',
        },
        // field_2 not mapped
      ],
    };

    const result = getDissectProcessorWithReview(pattern, reviewResult);

    // field_2 and field_3 should remain as-is since they weren't mapped
    expect(result.pattern).toContain('%{custom.field}');
    expect(result.pattern).toContain('%{field_2}');
    expect(result.pattern).toContain('%{field_3}');
  });

  it('replaces static fields with literal values', () => {
    const pattern: DissectPattern = {
      pattern: '%{field_1}=%{field_2} %{field_3}=%{field_4}',
      fields: [
        {
          name: 'field_1',
          values: ['user', 'user'],
          position: 0,
        },
        {
          name: 'field_2',
          values: ['john', 'jane'],
          position: 1,
        },
        {
          name: 'field_3',
          values: ['status', 'status'],
          position: 2,
        },
        {
          name: 'field_4',
          values: ['active', 'inactive'],
          position: 3,
        },
      ],
    };

    const reviewResult: NormalizedReviewResult = {
      log_source: 'Key-Value Log',
      fields: [
        {
          ecs_field: 'user_key',
          columns: ['field_1'],
          join_strategy: 'skip',
          is_static: true,
          static_value: 'user',
        },
        {
          ecs_field: 'user.name',
          columns: ['field_2'],
          join_strategy: 'skip',
        },
        {
          ecs_field: 'status_key',
          columns: ['field_3'],
          join_strategy: 'skip',
          is_static: true,
          static_value: 'status',
        },
        {
          ecs_field: 'event.status',
          columns: ['field_4'],
          join_strategy: 'skip',
        },
      ],
    };

    const result = getDissectProcessorWithReview(pattern, reviewResult);

    // Static fields should be replaced with literal values
    expect(result.pattern).toBe('user=%{user.name} status=%{event.status}');
  });

  it('handles static fields with special characters', () => {
    const pattern: DissectPattern = {
      pattern: '%{field_1}: %{field_2}',
      fields: [
        {
          name: 'field_1',
          values: ['timestamp', 'timestamp'],
          position: 0,
        },
        {
          name: 'field_2',
          values: ['2024-01-15', '2024-01-16'],
          position: 1,
        },
      ],
    };

    const reviewResult: NormalizedReviewResult = {
      log_source: 'Structured Log',
      fields: [
        {
          ecs_field: 'label',
          columns: ['field_1'],
          join_strategy: 'skip',
          is_static: true,
          static_value: 'timestamp',
        },
        {
          ecs_field: 'custom.timestamp',
          columns: ['field_2'],
          join_strategy: 'skip',
        },
      ],
    };

    const result = getDissectProcessorWithReview(pattern, reviewResult);

    expect(result.pattern).toBe('timestamp: %{custom.timestamp}');
  });

  it('collapses trailing repeated append fields', () => {
    const pattern: DissectPattern = {
      pattern: '%{field_1} %{field_2} %{field_3} %{field_4} %{field_5}',
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
          join_strategy: 'skip',
        },
        {
          ecs_field: 'message',
          columns: ['field_2', 'field_3', 'field_4', 'field_5'],
          join_strategy: 'append',
        },
      ],
    };

    const result = getDissectProcessorWithReview(pattern, reviewResult);

    expect(result.pattern).toBe('%{log.level} %{message}');
    expect(result.processor.dissect.append_separator).toBe(' ');
  });
});
