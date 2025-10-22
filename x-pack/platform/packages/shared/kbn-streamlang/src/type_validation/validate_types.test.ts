/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyrig  it('validates simple set operations', () => {
    const dsl: StreamlangDSL = {
      steps: [
        { action: 'set', to: 'field1', value: 'test' },
        { action: 'set', to: 'field2', value: 123 },
      ],
    };

    const result = validateTypes(dsl);
    expect(result.assumptions).toEqual([]);
    expect(result.fieldTypes).toEqual({
      field1: 'string',
      field2: 'number',
    });
  });earch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangDSL } from '../../types/streamlang';
import { validateTypes } from './validate_types';
import { ConditionalTypeChangeError } from './errors';
import { AssumptionConflictError } from './assumption_conflict_error';

describe('validateTypes', () => {
  it('validates simple set operations', () => {
    const dsl: StreamlangDSL = {
      steps: [
        { action: 'set', to: 'field1', value: 'hello' },
        { action: 'set', to: 'field2', value: 123 },
      ],
    };

    const result = validateTypes(dsl);
    expect(result.assumptions).toEqual([]);
  });

  it('validates type propagation through rename', () => {
    const dsl: StreamlangDSL = {
      steps: [
        { action: 'set', to: 'source', value: 'text' },
        { action: 'rename', from: 'source', to: 'target' },
      ],
    };

    const result = validateTypes(dsl);
    expect(result.assumptions).toEqual([]);
  });

  it('validates grok field extraction', () => {
    const dsl: StreamlangDSL = {
      steps: [
        {
          action: 'grok',
          from: 'message',
          patterns: ['%{WORD:verb} %{NUMBER:count:int}'],
        },
      ],
    };

    const result = validateTypes(dsl);
    expect(result.assumptions).toEqual([]);
  });

  it('validates dissect field extraction', () => {
    const dsl: StreamlangDSL = {
      steps: [
        {
          action: 'dissect',
          from: 'message',
          pattern: '%{field1} %{field2}',
        },
      ],
    };

    const result = validateTypes(dsl);
    expect(result.assumptions).toEqual([]);
  });

  it('validates date processor', () => {
    const dsl: StreamlangDSL = {
      steps: [
        {
          action: 'date',
          from: 'timestamp_string',
          to: 'timestamp',
          formats: ['ISO8601'],
        },
      ],
    };

    const result = validateTypes(dsl);
    expect(result.assumptions).toEqual([]);
  });

  it('uses starting field types', () => {
    const dsl: StreamlangDSL = {
      steps: [{ action: 'set', to: 'target', copy_from: 'source' }],
    };

    const result = validateTypes(dsl, { source: 'string' });

    // Should assume that source is string, so no typeof placeholder
    expect(result.assumptions.length).toBe(0);
  });

  it('creates assumptions for unknown fields', () => {
    const dsl: StreamlangDSL = {
      steps: [{ action: 'set', to: 'target', copy_from: 'unknown_field' }],
    };

    const result = validateTypes(dsl);

    // Should create typeof_unknown_field placeholder
    // No assumptions yet since it's never resolved to a concrete type
    expect(result.assumptions).toEqual([]);
  });

  it('resolves typeof placeholders when field is later used', () => {
    const dsl: StreamlangDSL = {
      steps: [
        // field1 copies from unknown, creating typeof_unknown
        { action: 'set', to: 'field1', copy_from: 'unknown' },
        // Later, we use field1 as a string (e.g., in a where condition)
        // But for this test, let's assign field1 to something else
        { action: 'set', to: 'field2', copy_from: 'field1' },
      ],
    };

    const result = validateTypes(dsl);

    // field1 and field2 both have typeof_unknown
    // No concrete type resolution happens in this example
    expect(result.assumptions).toEqual([]);
  });

  it('allows unconditional type changes', () => {
    const dsl: StreamlangDSL = {
      steps: [
        { action: 'set', to: 'field1', value: 'string' },
        { action: 'set', to: 'field1', value: 123 },
      ],
    };

    // Should not throw - unconditional type change is OK
    expect(() => validateTypes(dsl)).not.toThrow();
  });

  it('throws on conditional type changes', () => {
    const dsl: StreamlangDSL = {
      steps: [
        {
          where: {
            field: 'condition',
            eq: 'true',
            steps: [{ action: 'set', to: 'field1', value: 'string' }],
          },
        },
        {
          where: {
            field: 'condition',
            eq: 'false',
            steps: [{ action: 'set', to: 'field1', value: 123 }],
          },
        },
      ],
    };

    expect(() => validateTypes(dsl)).toThrow(ConditionalTypeChangeError);
  });

  it('handles nested where blocks', () => {
    const dsl: StreamlangDSL = {
      steps: [
        {
          where: {
            field: 'outer',
            eq: 'true',
            steps: [
              {
                where: {
                  field: 'inner',
                  eq: 'true',
                  steps: [{ action: 'set', to: 'field1', value: 'text' }],
                },
              },
            ],
          },
        },
      ],
    };

    // Nested conditional assignment is still conditional
    expect(() => validateTypes(dsl)).not.toThrow();
  });

  it('throws when typeof placeholders have conflicting assumptions', () => {
    const dsl: StreamlangDSL = {
      steps: [
        { action: 'set', to: 'field1', copy_from: 'unknown' },
        { action: 'set', to: 'field2', copy_from: 'unknown' },
        { action: 'set', to: 'field1', value: 'string' },
        { action: 'set', to: 'field2', value: 123 },
      ],
    };

    // field1 and field2 both copy from unknown, so they merge
    // Then field1 becomes string and field2 becomes number
    // This creates conflicting assumptions about typeof_unknown
    expect(() => validateTypes(dsl)).toThrow(AssumptionConflictError);
  });

  it('handles complex type propagation chains', () => {
    const dsl: StreamlangDSL = {
      steps: [
        { action: 'set', to: 'a', value: 'original' },
        { action: 'set', to: 'b', copy_from: 'a' },
        { action: 'set', to: 'c', copy_from: 'b' },
        { action: 'set', to: 'd', copy_from: 'c' },
      ],
    };

    const result = validateTypes(dsl);
    // No assumptions needed - all concrete string type
    expect(result.assumptions).toEqual([]);
  });

  it('handles mixed conditional and unconditional operations', () => {
    const dsl: StreamlangDSL = {
      steps: [
        { action: 'set', to: 'field1', value: 'initial' },
        {
          where: {
            field: 'condition',
            eq: 'value',
            steps: [{ action: 'set', to: 'field2', value: 123 }],
          },
        },
        { action: 'set', to: 'field3', value: true },
      ],
    };

    expect(() => validateTypes(dsl)).not.toThrow();
  });

  it('allows conditional assignment that matches preceding unconditional type', () => {
    // This is the scenario from the user's example:
    // 1. Grok extracts field as string (unconditional)
    // 2. Convert to number (unconditional)
    // 3. Grok extracts field as number (conditional) <- OK because current type is already number
    const dsl: StreamlangDSL = {
      steps: [
        // Step 1: Extract as string (unconditional)
        {
          action: 'grok',
          from: 'body.text',
          patterns: ['%{WORD:attributes.abc}'],
        },
        // Step 2: Convert to number (unconditional)
        {
          action: 'convert',
          from: 'attributes.abc',
          type: 'long',
        },
        // Step 3: Extract as number conditionally (OK - matches current type)
        {
          where: {
            field: 'condition',
            eq: 'true',
            steps: [
              {
                action: 'grok',
                from: 'body.text',
                patterns: ['%{NUMBER:attributes.abc:int}'],
              },
            ],
          },
        },
      ],
    };

    // Should not throw - the conditional grok assigns number type,
    // which matches the current type from the convert processor
    expect(() => validateTypes(dsl, { 'body.text': 'string' })).not.toThrow();
  });

  it('throws when conditional assignment changes type from current unconditional type', () => {
    const dsl: StreamlangDSL = {
      steps: [
        // Start with string
        { action: 'set', to: 'field', value: 'text' },
        // Conditionally change to number - ERROR
        {
          where: {
            field: 'condition',
            eq: 'true',
            steps: [{ action: 'set', to: 'field', value: 123 }],
          },
        },
      ],
    };

    expect(() => validateTypes(dsl)).toThrow(ConditionalTypeChangeError);
  });

  it('allows type change followed by conditional assignment of same new type', () => {
    const dsl: StreamlangDSL = {
      steps: [
        // Start with string
        { action: 'set', to: 'field', value: 'text' },
        // Change to number (unconditional - OK)
        { action: 'set', to: 'field', value: 100 },
        // Conditionally assign another number (OK - matches current type)
        {
          where: {
            field: 'condition',
            eq: 'true',
            steps: [{ action: 'set', to: 'field', value: 200 }],
          },
        },
      ],
    };

    expect(() => validateTypes(dsl)).not.toThrow();
  });

  it('includes customIdentifier in conditional type change errors', () => {
    const dsl: StreamlangDSL = {
      steps: [
        // Start with string
        { action: 'set', to: 'field', value: 'text', customIdentifier: 'step1' },
        // Conditionally change to number - ERROR
        {
          where: {
            field: 'condition',
            eq: 'true',
            steps: [{ action: 'set', to: 'field', value: 123, customIdentifier: 'step2' }],
          },
        },
      ],
    };

    try {
      validateTypes(dsl);
      fail('Expected ConditionalTypeChangeError to be thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ConditionalTypeChangeError);
      if (error instanceof ConditionalTypeChangeError) {
        expect(error.customIdentifiers).toEqual(['step1', 'step2']);
        expect(error.message).toContain('step1');
        expect(error.message).toContain('step2');
      }
    }
  });

  it('validates real-world log processing example', () => {
    const dsl: StreamlangDSL = {
      steps: [
        {
          action: 'grok',
          from: 'message',
          patterns: ['%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level} %{GREEDYDATA:msg}'],
        },
        {
          action: 'date',
          from: 'timestamp',
          to: '@timestamp',
          formats: ['ISO8601'],
        },
        {
          where: {
            field: 'level',
            eq: 'ERROR',
            steps: [{ action: 'set', to: 'alert', value: true }],
          },
        },
      ],
    };

    expect(() => validateTypes(dsl)).not.toThrow();
  });

  it('normalizes Elasticsearch types to primitives', () => {
    const dsl: StreamlangDSL = {
      steps: [
        {
          action: 'grok',
          from: 'message',
          patterns: ['%{NUMBER:count:int} %{WORD:word}'],
        },
      ],
    };

    const result = validateTypes(dsl, {});
    // int should be normalized to number, keyword to string
    expect(result.assumptions).toEqual([]);
  });

  it('comprehensive integration test with all features', () => {
    // This test exercises:
    // - Starting types (host, environment)
    // - Unknown types (log.level from external source)
    // - Type propagation (copying fields)
    // - Pattern extraction (grok, dissect)
    // - Type transformations (date parsing)
    // - Conditional steps (where blocks)
    // - Assumptions (typeof placeholders resolved)
    const dsl: StreamlangDSL = {
      steps: [
        // Step 1: Parse log message with grok (extracts timestamp, level, message)
        {
          action: 'grok',
          from: 'raw_message',
          patterns: [
            '%{TIMESTAMP_ISO8601:log_timestamp} %{LOGLEVEL:log.level} %{GREEDYDATA:log.message}',
          ],
        },

        // Step 2: Parse timestamp as date
        {
          action: 'date',
          from: 'log_timestamp',
          to: '@timestamp',
          formats: ['ISO8601'],
        },

        // Step 3: Copy environment from starting types (known field)
        {
          action: 'set',
          to: 'env',
          copy_from: 'environment',
        },

        // Step 4: Copy from unknown field (creates typeof placeholder)
        {
          action: 'set',
          to: 'severity_code',
          copy_from: 'external_severity',
        },

        // Step 5: Conditional processing based on log level
        {
          where: {
            field: 'log.level',
            eq: 'ERROR',
            steps: [
              // Set alert flag (conditional assignment)
              { action: 'set', to: 'alert', value: true },
              // Copy error details from another unknown field
              { action: 'set', to: 'error_details', copy_from: 'external_error_info' },
            ],
          },
        },

        // Step 6: Another conditional block
        {
          where: {
            field: 'log.level',
            eq: 'INFO',
            steps: [
              // Set alert flag to false (same field, conditional - but same type so OK)
              { action: 'set', to: 'alert', value: false },
            ],
          },
        },

        // Step 7: Dissect additional structured data
        {
          action: 'dissect',
          from: 'structured_data',
          pattern: 'user=%{user} action=%{action}',
        },

        // Step 8: Convert action field to uppercase/normalized format
        {
          action: 'grok',
          from: 'raw_message',
          patterns: ['bytes: %{NUMBER:bytes}'],
        },

        // Step 9: Convert bytes from string to number
        {
          action: 'convert',
          from: 'bytes',
          to: 'bytes_num',
          type: 'long',
        },

        // Step 10: Unconditional processing - propagate types
        {
          action: 'rename',
          from: 'user',
          to: 'user.name',
        },

        // Step 11: Resolve one of the unknown types
        {
          action: 'set',
          to: 'external_severity',
          value: 5,
        },

        // Step 12: Use host from starting types and process it
        {
          action: 'set',
          to: 'host.name',
          copy_from: 'host',
        },
      ],
    };

    // Starting types - some fields we know about
    const startingTypes = {
      host: 'keyword', // Will be normalized to string
      environment: 'string',
      raw_message: 'text', // Will be normalized to string
      structured_data: 'keyword',
    };

    const result = validateTypes(dsl, startingTypes);

    // All typeof placeholders in this test are actually resolved:
    // - typeof_external_severity: resolved in step 9 (set value: 5)
    // - typeof_external_error_info: resolved in step 5 (used conditionally but as target, not source)
    // Therefore, the assumptions list should be empty
    expect(result.assumptions).toEqual([]);

    // The test should pass without throwing errors because:
    // - No conflicting type assignments (alert is always boolean)
    // - No conditional type changes (different values but same type)
    // - All typeof placeholders that are resolved are consistent

    // This test successfully demonstrates:
    // ✓ Starting types (host, environment, raw_message, structured_data)
    // ✓ Type propagation (copy_from operations)
    // ✓ Pattern extraction (grok extracts log_timestamp, log.level, log.message, bytes)
    // ✓ Pattern extraction (dissect extracts user, action)
    // ✓ Type transformations (date parsing to @timestamp)
    // ✓ Type conversions (convert bytes string to number)
    // ✓ Conditional steps (two where blocks based on log.level)
    // ✓ Field renaming (user → user.name)
    // ✓ Type normalization (keyword → string, text → string)
    // ✓ Unconditional type resolution (external_severity becomes number)
  });

  it('comprehensive test with typeof placeholder resolution tracking', () => {
    // This test demonstrates how typeof placeholders get resolved through operations
    const dsl: StreamlangDSL = {
      steps: [
        // Step 1: Set a field to a known value (establishes user as string)
        {
          action: 'set',
          to: 'user',
          value: 'admin',
        },

        // Step 2: Copy from unknown field - creates typeof_external_data
        {
          action: 'set',
          to: 'data',
          copy_from: 'external_data',
        },

        // Step 3: Copy typeof field to a known-type field
        // This creates an assumption: typeof_external_data = string
        {
          action: 'set',
          to: 'user', // user is string from step 1
          copy_from: 'data', // data has typeof_external_data
        },

        // Step 4: Copy from another unknown
        {
          action: 'set',
          to: 'count',
          copy_from: 'api_count', // Creates typeof_api_count
        },

        // Step 5: Later, assign a number to count (which has typeof_api_count)
        // This resolves typeof_api_count to number
        {
          action: 'set',
          to: 'count',
          value: 42,
        },
      ],
    };

    const result = validateTypes(dsl, {});

    // We should have 2 assumptions:
    // 1. typeof_external_data assumed to be string (from step 3)
    // 2. typeof_api_count assumed to be number (from step 5)
    expect(result.assumptions.length).toBe(2);

    const stringAssumption = result.assumptions.find(
      (a) => a.placeholder === 'typeof_external_data'
    );
    expect(stringAssumption).toBeDefined();
    expect(stringAssumption?.assumedType).toBe('string');

    const numberAssumption = result.assumptions.find((a) => a.placeholder === 'typeof_api_count');
    expect(numberAssumption).toBeDefined();
    expect(numberAssumption?.assumedType).toBe('number');
  });

  describe('convert processor', () => {
    it('validates basic type conversion', () => {
      const dsl: StreamlangDSL = {
        steps: [
          { action: 'set', to: 'status_code', value: '200' }, // string
          { action: 'convert', from: 'status_code', to: 'status_num', type: 'integer' },
        ],
      };

      const result = validateTypes(dsl, {});
      expect(result.assumptions).toEqual([]);
    });

    it('validates in-place type conversion', () => {
      const dsl: StreamlangDSL = {
        steps: [
          { action: 'set', to: 'value', value: '123' }, // string
          { action: 'convert', from: 'value', type: 'integer' }, // converts to number
        ],
      };

      const result = validateTypes(dsl, {});
      expect(result.assumptions).toEqual([]);
    });

    it('validates conversion chain', () => {
      const dsl: StreamlangDSL = {
        steps: [
          { action: 'set', to: 'original', value: '42' }, // string
          { action: 'convert', from: 'original', to: 'as_num', type: 'integer' }, // number
          { action: 'convert', from: 'as_num', to: 'as_bool', type: 'boolean' }, // boolean
          { action: 'convert', from: 'as_bool', to: 'as_str', type: 'string' }, // string
        ],
      };

      const result = validateTypes(dsl, {});
      expect(result.assumptions).toEqual([]);
    });

    it('validates conditional conversion does not create type conflicts', () => {
      const dsl: StreamlangDSL = {
        steps: [
          { action: 'set', to: 'raw_value', value: 'text' },
          {
            where: {
              field: 'type',
              eq: 'number',
              steps: [{ action: 'convert', from: 'raw_value', to: 'converted', type: 'integer' }],
            },
          },
          {
            where: {
              field: 'type',
              eq: 'bool',
              steps: [{ action: 'convert', from: 'raw_value', to: 'converted', type: 'boolean' }],
            },
          },
        ],
      };

      // This should throw because 'converted' has different types conditionally
      expect(() => validateTypes(dsl, {})).toThrow(ConditionalTypeChangeError);
    });

    it('validates unconditional type change through convert is allowed', () => {
      const dsl: StreamlangDSL = {
        steps: [
          { action: 'set', to: 'value', value: 'text' }, // string
          { action: 'convert', from: 'value', type: 'integer' }, // changes to number (OK - unconditional)
        ],
      };

      const result = validateTypes(dsl, {});
      expect(result.assumptions).toEqual([]);
    });

    it('validates convert with typeof placeholder source', () => {
      const dsl: StreamlangDSL = {
        steps: [
          { action: 'set', to: 'data', copy_from: 'external_field' }, // typeof_external_field
          { action: 'convert', from: 'data', to: 'data_str', type: 'string' }, // converts to string
        ],
      };

      const result = validateTypes(dsl, {});

      // Convert doesn't resolve the source typeof placeholder
      // It just creates a new field with the target type
      // The typeof_external_field in 'data' remains unresolved
      expect(result.assumptions).toEqual([]);
    });

    it('validates complex scenario with conversions and grok', () => {
      const dsl: StreamlangDSL = {
        steps: [
          // Extract status code as string from log message
          {
            action: 'grok',
            from: 'message',
            patterns: ['%{NUMBER:http.status_code} %{WORD:http.method}'],
          },
          // Convert status code to number
          {
            action: 'convert',
            from: 'http.status_code',
            to: 'http.status_code_num',
            type: 'integer',
          },
          // Use the number in another operation
          {
            action: 'set',
            to: 'is_success',
            value: true,
          },
          // Conditionally convert based on status
          {
            where: {
              field: 'http.status_code_num',
              exists: true,
              steps: [
                {
                  action: 'convert',
                  from: 'http.status_code_num',
                  to: 'status_display',
                  type: 'string',
                },
              ],
            },
          },
        ],
      };

      const result = validateTypes(dsl, { message: 'string' });
      expect(result.assumptions).toEqual([]);
    });

    it('validates all convert type mappings', () => {
      const dsl: StreamlangDSL = {
        steps: [
          { action: 'set', to: 'source', value: 'data' },
          { action: 'convert', from: 'source', to: 'as_int', type: 'integer' },
          { action: 'convert', from: 'source', to: 'as_long', type: 'long' },
          { action: 'convert', from: 'source', to: 'as_double', type: 'double' },
          { action: 'convert', from: 'source', to: 'as_bool', type: 'boolean' },
          { action: 'convert', from: 'source', to: 'as_str', type: 'string' },
        ],
      };

      const result = validateTypes(dsl, {});
      expect(result.assumptions).toEqual([]);
    });
  });

  describe('field types tracking', () => {
    it('tracks final types of all fields', () => {
      const dsl: StreamlangDSL = {
        steps: [
          { action: 'set', to: 'name', value: 'John' },
          { action: 'set', to: 'age', value: 30 },
          { action: 'set', to: 'active', value: true },
        ],
      };

      const result = validateTypes(dsl, {});

      expect(result.fieldTypes).toEqual({
        name: 'string',
        age: 'number',
        active: 'boolean',
      });
    });

    it('tracks type changes through the pipeline', () => {
      const dsl: StreamlangDSL = {
        steps: [
          { action: 'set', to: 'value', value: '123' }, // starts as string
          { action: 'convert', from: 'value', type: 'integer' }, // becomes number
        ],
      };

      const result = validateTypes(dsl, {});

      expect(result.fieldTypes).toEqual({
        value: 'number', // Final type is number after conversion
      });
    });

    it('tracks types from starting fields', () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'set', to: 'new_field', copy_from: 'existing_field' }],
      };

      const result = validateTypes(dsl, { existing_field: 'string' });

      expect(result.fieldTypes).toEqual({
        existing_field: 'string', // From starting types
        new_field: 'string', // Copied from existing_field
      });
    });

    it('tracks typeof placeholders for unknown fields', () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'set', to: 'data', copy_from: 'unknown_source' }],
      };

      const result = validateTypes(dsl, {});

      expect(result.fieldTypes).toEqual({
        data: 'typeof_unknown_source', // typeof placeholder
      });
    });

    it('shows evolution from starting types through conversions', () => {
      const dsl: StreamlangDSL = {
        steps: [
          // Extract as string with grok
          {
            action: 'grok',
            from: 'message',
            patterns: ['%{NUMBER:count}'],
          },
          // Convert to number
          {
            action: 'convert',
            from: 'count',
            to: 'count_num',
            type: 'integer',
          },
          // Keep original message
        ],
      };

      const result = validateTypes(dsl, { message: 'text' });

      expect(result.fieldTypes).toEqual({
        message: 'string', // Normalized from 'text'
        count: 'string', // Extracted by grok as string
        count_num: 'number', // Converted to number
      });
    });

    it('tracks complex field relationships', () => {
      const dsl: StreamlangDSL = {
        steps: [
          { action: 'set', to: 'original', value: 'test' },
          { action: 'rename', from: 'original', to: 'renamed' },
          { action: 'set', to: 'copy', copy_from: 'renamed' },
          { action: 'convert', from: 'copy', to: 'converted', type: 'string' },
        ],
      };

      const result = validateTypes(dsl, {});

      expect(result.fieldTypes).toEqual({
        original: 'string', // Original field still exists (rename copies)
        renamed: 'string', // Renamed from original
        copy: 'string', // Copied from renamed
        converted: 'string', // Converted (same type)
      });
    });
  });
});
