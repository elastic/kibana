/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateStreamlang } from './validate_streamlang';
import type { StreamlangDSL } from '../../types/streamlang';

describe('validateStreamlang', () => {
  describe('non-namespaced field validation for wired streams', () => {
    it('should pass validation when all fields are namespaced', () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'attributes.custom_field',
            value: 'test',
          },
          {
            action: 'set',
            to: 'body.structured.data',
            value: 'test',
          },
          {
            action: 'rename',
            from: 'old_field',
            to: 'resource.attributes.new_field',
          },
        ],
      };

      const result = validateStreamlang(dsl, { isWiredStream: true });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when fields are not namespaced in wired streams', () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'custom_field',
            value: 'test',
          },
        ],
      };

      const result = validateStreamlang(dsl, { isWiredStream: true });

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('non_namespaced_field');
      expect(result.errors[0].field).toBe('custom_field');
      expect(result.errors[0].message).toContain('does not match the streams recommended schema');
    });

    it('should detect multiple non-namespaced fields', () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'field1',
            value: 'test',
          },
          {
            action: 'set',
            to: 'field2',
            value: 'test',
          },
        ],
      };

      const result = validateStreamlang(dsl, { isWiredStream: true });

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].field).toBe('field1');
      expect(result.errors[1].field).toBe('field2');
    });

    it('should not validate namespacing when isWiredStream is false', () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'custom_field',
            value: 'test',
          },
        ],
      };

      const result = validateStreamlang(dsl, { isWiredStream: false });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('reserved field validation', () => {
    it('should fail validation when modifying reserved fields', () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: '@timestamp',
            value: 'test',
          },
        ],
      };

      const result = validateStreamlang(dsl, {
        reservedFields: ['@timestamp', 'data_stream.type'],
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('reserved_field');
      expect(result.errors[0].field).toBe('@timestamp');
      expect(result.errors[0].message).toContain('trying to modify reserved field');
    });

    it('should pass validation when not modifying reserved fields', () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'custom.field',
            value: 'test',
          },
        ],
      };

      const result = validateStreamlang(dsl, {
        reservedFields: ['@timestamp', 'data_stream.type'],
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('grok processor field extraction', () => {
    it('should extract fields from grok patterns', () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'grok',
            from: 'message',
            patterns: ['%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level} %{GREEDYDATA:msg}'],
          },
        ],
      };

      const result = validateStreamlang(dsl, { isWiredStream: true });

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors.map((e) => e.field).sort()).toEqual(['level', 'msg', 'timestamp']);
    });

    it('should validate namespaced grok fields correctly', () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'grok',
            from: 'message',
            patterns: [
              '%{TIMESTAMP_ISO8601:attributes.timestamp} %{LOGLEVEL:attributes.level} %{GREEDYDATA:attributes.msg}',
            ],
          },
        ],
      };

      const result = validateStreamlang(dsl, { isWiredStream: true });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('dissect processor field extraction', () => {
    it('should extract fields from dissect patterns', () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'dissect',
            from: 'message',
            pattern: '%{timestamp} %{level} %{msg}',
          },
        ],
      };

      const result = validateStreamlang(dsl, { isWiredStream: true });

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors.map((e) => e.field).sort()).toEqual(['level', 'msg', 'timestamp']);
    });

    it('should validate namespaced dissect fields correctly', () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'dissect',
            from: 'message',
            pattern: '%{attributes.timestamp} %{attributes.level}',
          },
        ],
      };

      const result = validateStreamlang(dsl, { isWiredStream: true });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('rename processor validation', () => {
    it('should validate the target field in rename processor', () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'rename',
            from: 'old_field',
            to: 'new_field',
          },
        ],
      };

      const result = validateStreamlang(dsl, { isWiredStream: true });

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('new_field');
    });
  });

  describe('append processor validation', () => {
    it('should validate the target field in append processor', () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'append',
            to: 'tags',
            value: ['new-tag'],
          },
        ],
      };

      const result = validateStreamlang(dsl, { isWiredStream: true });

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('tags');
    });
  });

  describe('nested where blocks', () => {
    it('should validate fields in nested where blocks', () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            where: {
              field: 'status',
              eq: 200,
              steps: [
                {
                  action: 'set',
                  to: 'invalid_field',
                  value: 'success',
                },
              ],
            },
          },
        ],
      };

      const result = validateStreamlang(dsl, { isWiredStream: true });

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('invalid_field');
    });
  });

  describe('combined validation', () => {
    it('should detect both non-namespaced and reserved field violations', () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'invalid_field',
            value: 'test',
          },
          {
            action: 'set',
            to: '@timestamp',
            value: 'test',
          },
        ],
      };

      const result = validateStreamlang(dsl, {
        isWiredStream: true,
        reservedFields: ['@timestamp'],
      });

      expect(result.isValid).toBe(false);
      // @timestamp is a keep field, so it only generates the reserved field error
      // invalid_field generates the non-namespaced error
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].type).toBe('non_namespaced_field');
      expect(result.errors[0].field).toBe('invalid_field');
      expect(result.errors[1].type).toBe('reserved_field');
      expect(result.errors[1].field).toBe('@timestamp');
    });
  });

  describe('custom identifier tracking', () => {
    it('should include custom identifier in error messages', () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'invalid_field',
            value: 'test',
            customIdentifier: 'my-custom-processor',
          },
        ],
      };

      const result = validateStreamlang(dsl, { isWiredStream: true });

      expect(result.isValid).toBe(false);
      expect(result.errors[0].processorId).toBe('my-custom-processor');
      expect(result.errors[0].message).toContain('my-custom-processor');
    });
  });

  describe('empty DSL', () => {
    it('should pass validation for empty steps array', () => {
      const dsl: StreamlangDSL = {
        steps: [],
      };

      const result = validateStreamlang(dsl, {
        isWiredStream: true,
        reservedFields: ['@timestamp'],
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('keep fields validation', () => {
    it('should allow special keep fields without namespacing', () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: '@timestamp',
            value: '2024-01-01',
          },
          {
            action: 'set',
            to: 'trace_id',
            value: 'abc123',
          },
          {
            action: 'set',
            to: 'span_id',
            value: 'def456',
          },
          {
            action: 'set',
            to: 'severity_text',
            value: 'INFO',
          },
          {
            action: 'set',
            to: 'severity_number',
            value: 9,
          },
          {
            action: 'set',
            to: 'event_name',
            value: 'test.event',
          },
        ],
      };

      const result = validateStreamlang(dsl, { isWiredStream: true });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow body and body.text without namespacing', () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'body',
            value: { text: 'message' },
          },
          {
            action: 'set',
            to: 'body.text',
            value: 'message',
          },
        ],
      };

      const result = validateStreamlang(dsl, { isWiredStream: true });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow observed_timestamp and other keep fields', () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'observed_timestamp',
            value: '2024-01-01',
          },
          {
            action: 'set',
            to: 'dropped_attributes_count',
            value: 0,
          },
          {
            action: 'set',
            to: 'scope',
            value: { name: 'test' },
          },
        ],
      };

      const result = validateStreamlang(dsl, { isWiredStream: true });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should still reject truly non-namespaced custom fields', () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'my_custom_field',
            value: 'test',
          },
          {
            action: 'set',
            to: 'another_field',
            value: 'test',
          },
        ],
      };

      const result = validateStreamlang(dsl, { isWiredStream: true });

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].field).toBe('my_custom_field');
      expect(result.errors[1].field).toBe('another_field');
    });
  });

  describe('all namespace prefixes', () => {
    it('should allow all valid namespace prefixes', () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'body.structured.custom',
            value: 'test',
          },
          {
            action: 'set',
            to: 'attributes.custom',
            value: 'test',
          },
          {
            action: 'set',
            to: 'scope.attributes.custom',
            value: 'test',
          },
          {
            action: 'set',
            to: 'resource.attributes.custom',
            value: 'test',
          },
        ],
      };

      const result = validateStreamlang(dsl, { isWiredStream: true });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject fields that partially match namespace prefixes', () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'body.other',
            value: 'test',
          },
          {
            action: 'set',
            to: 'resource.other',
            value: 'test',
          },
        ],
      };

      const result = validateStreamlang(dsl, { isWiredStream: true });

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].field).toBe('body.other');
      expect(result.errors[1].field).toBe('resource.other');
    });
  });

  describe('type tracking and validation', () => {
    describe('type inference from processors', () => {
      it('should infer string type from grok processor', () => {
        const dsl: StreamlangDSL = {
          steps: [
            {
              action: 'grok',
              from: 'message',
              patterns: ['%{IP:attributes.ip_address}'],
            },
            {
              action: 'date',
              from: 'attributes.ip_address',
              formats: ['ISO8601'],
            },
          ],
        };

        const result = validateStreamlang(dsl, { validateTypes: true });

        // Grok produces string, date processor expects string - should be valid
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should infer string type from dissect processor', () => {
        const dsl: StreamlangDSL = {
          steps: [
            {
              action: 'dissect',
              from: 'message',
              pattern: '%{attributes.timestamp} %{attributes.level}',
            },
            {
              action: 'replace',
              from: 'attributes.level',
              pattern: 'ERROR',
              replacement: 'ERR',
            },
          ],
        };

        const result = validateStreamlang(dsl, { validateTypes: true });

        // Dissect produces string, replace expects string - should be valid
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should infer type from set processor value', () => {
        const dsl: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: 'attributes.count',
              value: 42,
            },
            {
              action: 'set',
              to: 'attributes.enabled',
              value: true,
            },
            {
              action: 'set',
              to: 'attributes.name',
              value: 'test',
            },
          ],
        };

        const result = validateStreamlang(dsl, { validateTypes: true });

        // No type conflicts - all fields are set with their values
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should track type changes through convert processor', () => {
        const dsl: StreamlangDSL = {
          steps: [
            {
              action: 'grok',
              from: 'message',
              patterns: ['%{NUMBER:attributes.value}'],
            },
            {
              action: 'convert',
              from: 'attributes.value',
              type: 'integer',
            },
          ],
        };

        const result = validateStreamlang(dsl, { validateTypes: true });

        // Grok produces string, convert changes it to number - no validation errors
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should infer number type from grok with :int suffix', () => {
        const dsl: StreamlangDSL = {
          steps: [
            {
              action: 'grok',
              from: 'message',
              patterns: ['%{NUMBER:attributes.count:int}'],
            },
            {
              action: 'replace',
              from: 'attributes.count',
              pattern: '123',
              replacement: '456',
            },
          ],
        };

        const result = validateStreamlang(dsl, { validateTypes: true });

        // Grok with :int produces number, replace expects string - should be invalid
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].type).toBe('type_mismatch');
        expect(result.errors[0].field).toBe('attributes.count');
        expect(result.errors[0].actualType).toBe('number');
        expect(result.errors[0].expectedType).toBe('string');
      });

      it('should infer number type from grok with :float suffix', () => {
        const dsl: StreamlangDSL = {
          steps: [
            {
              action: 'grok',
              from: 'message',
              patterns: ['%{NUMBER:attributes.value:float}'],
            },
            {
              action: 'date',
              from: 'attributes.value',
              formats: ['ISO8601'],
            },
          ],
        };

        const result = validateStreamlang(dsl, { validateTypes: true });

        // Grok with :float produces number, date expects string - should be invalid
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].actualType).toBe('number');
      });
    });

    describe('type mismatch detection', () => {
      it('should detect date processor used on non-string field', () => {
        const dsl: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: 'attributes.timestamp',
              value: 12345,
            },
            {
              action: 'date',
              from: 'attributes.timestamp',
              formats: ['ISO8601'],
            },
          ],
        };

        const result = validateStreamlang(dsl, { validateTypes: true });

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].type).toBe('type_mismatch');
        expect(result.errors[0].field).toBe('attributes.timestamp');
        expect(result.errors[0].expectedType).toBe('string');
        expect(result.errors[0].actualType).toBe('number');
        expect(result.errors[0].message).toContain(
          'expects field "attributes.timestamp" to be of type string'
        );
      });

      it('should detect replace processor used on non-string field', () => {
        const dsl: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: 'attributes.value',
              value: 42,
            },
            {
              action: 'replace',
              from: 'attributes.value',
              pattern: '42',
              replacement: '100',
            },
          ],
        };

        const result = validateStreamlang(dsl, { validateTypes: true });

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].type).toBe('type_mismatch');
        expect(result.errors[0].field).toBe('attributes.value');
        expect(result.errors[0].expectedType).toBe('string');
        expect(result.errors[0].actualType).toBe('number');
      });

      it('should detect multiple type mismatches', () => {
        const dsl: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: 'attributes.field1',
              value: 123,
            },
            {
              action: 'set',
              to: 'attributes.field2',
              value: true,
            },
            {
              action: 'date',
              from: 'attributes.field1',
              formats: ['ISO8601'],
            },
            {
              action: 'replace',
              from: 'attributes.field2',
              pattern: 'true',
              replacement: 'false',
            },
          ],
        };

        const result = validateStreamlang(dsl, { validateTypes: true });

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(2);
        expect(result.errors[0].field).toBe('attributes.field1');
        expect(result.errors[0].actualType).toBe('number');
        expect(result.errors[1].field).toBe('attributes.field2');
        expect(result.errors[1].actualType).toBe('boolean');
      });
    });

    describe('type propagation through pipeline', () => {
      it('should track types through rename processor', () => {
        const dsl: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: 'attributes.old_field',
              value: 'test string',
            },
            {
              action: 'rename',
              from: 'attributes.old_field',
              to: 'attributes.new_field',
            },
            {
              action: 'replace',
              from: 'attributes.new_field',
              pattern: 'test',
              replacement: 'prod',
            },
          ],
        };

        const result = validateStreamlang(dsl, { validateTypes: true });

        // Type should propagate from old_field to new_field, replace should succeed
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should track types through set with copy_from', () => {
        const dsl: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: 'attributes.source',
              value: 'original',
            },
            {
              action: 'set',
              to: 'attributes.copy',
              copy_from: 'attributes.source',
            },
            {
              action: 'replace',
              from: 'attributes.copy',
              pattern: 'original',
              replacement: 'copied',
            },
          ],
        };

        const result = validateStreamlang(dsl, { validateTypes: true });

        // Type should propagate through copy_from
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should allow type to change through convert in pipeline', () => {
        const dsl: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: 'attributes.value',
              value: '123',
            },
            {
              action: 'replace',
              from: 'attributes.value',
              pattern: '123',
              replacement: '456',
            },
            {
              action: 'convert',
              from: 'attributes.value',
              type: 'integer',
            },
          ],
        };

        const result = validateStreamlang(dsl, { validateTypes: true });

        // String operations happen before convert, so it's valid
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should detect type mismatch after convert', () => {
        const dsl: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: 'attributes.value',
              value: '123',
            },
            {
              action: 'convert',
              from: 'attributes.value',
              type: 'integer',
            },
            {
              action: 'replace',
              from: 'attributes.value',
              pattern: '123',
              replacement: '456',
            },
          ],
        };

        const result = validateStreamlang(dsl, { validateTypes: true });

        // After convert, it's a number, so replace shouldn't work
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].type).toBe('type_mismatch');
        expect(result.errors[0].field).toBe('attributes.value');
        expect(result.errors[0].actualType).toBe('number');
      });
    });

    describe('initial field types', () => {
      it('should use initial field types for validation', () => {
        const dsl: StreamlangDSL = {
          steps: [
            {
              action: 'replace',
              from: 'attributes.existing_string',
              pattern: 'old',
              replacement: 'new',
            },
          ],
        };

        const initialTypes = new Map();
        initialTypes.set('attributes.existing_string', 'string');

        const result = validateStreamlang(dsl, {
          validateTypes: true,
          initialFieldTypes: initialTypes,
        });

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should detect type mismatch with initial field types', () => {
        const dsl: StreamlangDSL = {
          steps: [
            {
              action: 'date',
              from: 'attributes.existing_number',
              formats: ['ISO8601'],
            },
          ],
        };

        const initialTypes = new Map();
        initialTypes.set('attributes.existing_number', 'number');

        const result = validateStreamlang(dsl, {
          validateTypes: true,
          initialFieldTypes: initialTypes,
        });

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].type).toBe('type_mismatch');
        expect(result.errors[0].actualType).toBe('number');
        expect(result.errors[0].expectedType).toBe('string');
      });
    });

    describe('edge cases', () => {
      it('should handle unknown types gracefully', () => {
        const dsl: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: 'attributes.field',
              copy_from: 'unknown_source',
            },
            {
              action: 'replace',
              from: 'attributes.field',
              pattern: 'test',
              replacement: 'prod',
            },
          ],
        };

        const result = validateStreamlang(dsl, { validateTypes: true });

        // Unknown type from copy_from, so validation doesn't flag error
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should not validate types when validateTypes is false', () => {
        const dsl: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: 'attributes.value',
              value: 123,
            },
            {
              action: 'date',
              from: 'attributes.value',
              formats: ['ISO8601'],
            },
          ],
        };

        const result = validateStreamlang(dsl, { validateTypes: false });

        // Type validation disabled, so no errors
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle date processor producing date type', () => {
        const dsl: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: 'attributes.timestamp_string',
              value: '2024-01-01T00:00:00Z',
            },
            {
              action: 'date',
              from: 'attributes.timestamp_string',
              to: 'attributes.parsed_date',
              formats: ['ISO8601'],
            },
          ],
        };

        const result = validateStreamlang(dsl, { validateTypes: true });

        // Date processor parses string to date type - valid
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle convert processor with different target types', () => {
        const dsl: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: 'attributes.str_value',
              value: '123',
            },
            {
              action: 'convert',
              from: 'attributes.str_value',
              type: 'long',
            },
            {
              action: 'convert',
              from: 'attributes.str_value',
              type: 'boolean',
            },
          ],
        };

        const result = validateStreamlang(dsl, { validateTypes: true });

        // Multiple conversions on same field - last one wins
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('combined validation with type checking', () => {
      it('should detect both namespace and type errors', () => {
        const dsl: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: 'bad_field',
              value: 123,
            },
            {
              action: 'date',
              from: 'bad_field',
              formats: ['ISO8601'],
            },
          ],
        };

        const result = validateStreamlang(dsl, {
          isWiredStream: true,
          validateTypes: true,
        });

        expect(result.isValid).toBe(false);
        // Should have both non-namespaced error and type mismatch error
        expect(result.errors.length).toBeGreaterThanOrEqual(2);
        expect(result.errors.some((e) => e.type === 'non_namespaced_field')).toBe(true);
        expect(result.errors.some((e) => e.type === 'type_mismatch')).toBe(true);
      });
    });
  });

  describe('mixed type validation', () => {
    describe('conditional type changes', () => {
      it('should detect mixed types when a conditional processor changes a field type', () => {
        const dsl: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: 'myfield',
              value: 42, // Sets myfield to number
            },
            {
              action: 'set',
              to: 'myfield',
              value: 'hello', // Conditionally sets myfield to string
              where: {
                field: 'somecondition',
                eq: true,
              },
            },
          ],
        };

        const result = validateStreamlang(dsl, { validateTypes: true });

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].type).toBe('mixed_type');
        expect(result.errors[0].field).toBe('myfield');
        expect(result.errors[0].conflictingTypes).toEqual(
          expect.arrayContaining(['number', 'string'])
        );
        expect(result.errors[0].message).toContain('mixed types');
        expect(result.errors[0].message).toContain('conditional processor');
      });

      it('should detect mixed types from grok with :type suffix', () => {
        const dsl: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: 'myfield',
              value: 'initial string',
            },
            {
              action: 'grok',
              from: 'message',
              patterns: ['%{NUMBER:myfield:int}'], // Conditionally extracts as number
              where: {
                field: 'needs_parsing',
                eq: true,
              },
            },
          ],
        };

        const result = validateStreamlang(dsl, { validateTypes: true });

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].type).toBe('mixed_type');
        expect(result.errors[0].field).toBe('myfield');
        expect(result.errors[0].conflictingTypes).toEqual(
          expect.arrayContaining(['string', 'number'])
        );
      });

      it('should detect mixed types from convert processor', () => {
        const dsl: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: 'amount',
              value: '100', // String
            },
            {
              action: 'convert',
              from: 'amount',
              type: 'integer', // Conditionally convert to number
              where: {
                field: 'should_convert',
                eq: 'yes',
              },
            },
          ],
        };

        const result = validateStreamlang(dsl, { validateTypes: true });

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].type).toBe('mixed_type');
        expect(result.errors[0].field).toBe('amount');
        expect(result.errors[0].conflictingTypes).toEqual(
          expect.arrayContaining(['string', 'number'])
        );
      });

      it('should allow nested conditional processors to create mixed types', () => {
        const dsl: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: 'status',
              value: 0, // Number initially
            },
            {
              where: {
                field: 'outer_condition',
                eq: true,
                steps: [
                  {
                    action: 'set',
                    to: 'status',
                    value: 'active', // String if outer condition true
                    where: {
                      field: 'inner_condition',
                      eq: 'yes',
                    },
                  },
                ],
              },
            },
          ],
        };

        const result = validateStreamlang(dsl, { validateTypes: true });

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThanOrEqual(1);
        const mixedTypeError = result.errors.find(
          (e) => e.type === 'mixed_type' && e.field === 'status'
        );
        expect(mixedTypeError).toBeDefined();
        expect(mixedTypeError?.conflictingTypes).toEqual(
          expect.arrayContaining(['number', 'string'])
        );
      });
    });

    describe('unconditional type changes', () => {
      it('should allow unconditional type changes without mixed type error', () => {
        const dsl: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: 'myfield',
              value: 42, // Number
            },
            {
              action: 'set',
              to: 'myfield',
              value: 'hello', // Unconditionally changes to string
            },
          ],
        };

        const result = validateStreamlang(dsl, { validateTypes: true });

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should allow unconditional type change with always condition', () => {
        const dsl: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: 'myfield',
              value: 42,
            },
            {
              action: 'set',
              to: 'myfield',
              value: 'hello',
              where: {
                always: {},
              },
            },
          ],
        };

        const result = validateStreamlang(dsl, { validateTypes: true });

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should allow convert processor to change type unconditionally', () => {
        const dsl: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: 'amount',
              value: '100',
            },
            {
              action: 'convert',
              from: 'amount',
              type: 'integer', // Unconditionally convert
            },
          ],
        };

        const result = validateStreamlang(dsl, { validateTypes: true });

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should allow grok to replace field type unconditionally', () => {
        const dsl: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: 'port',
              value: 'unknown',
            },
            {
              action: 'grok',
              from: 'message',
              patterns: ['Port: %{NUMBER:port:int}'], // Unconditionally extracts as number
            },
          ],
        };

        const result = validateStreamlang(dsl, { validateTypes: true });

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('multiple conditional modifications', () => {
      it('should detect mixed types from multiple different conditional processors', () => {
        const dsl: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: 'result',
              value: 0, // Number initially
            },
            {
              action: 'set',
              to: 'result',
              value: 'success',
              where: {
                field: 'status',
                eq: 'ok',
              },
            },
            {
              action: 'set',
              to: 'result',
              value: true, // Third type
              where: {
                field: 'status',
                eq: 'done',
              },
            },
          ],
        };

        const result = validateStreamlang(dsl, { validateTypes: true });

        expect(result.isValid).toBe(false);
        // Should have 2 errors: one for string, one for boolean
        expect(result.errors.filter((e) => e.type === 'mixed_type')).toHaveLength(2);
        const errors = result.errors.filter((e) => e.type === 'mixed_type' && e.field === 'result');
        expect(errors.length).toBeGreaterThanOrEqual(1);
      });

      it('should accumulate types across multiple conditional branches', () => {
        const dsl: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: 'value',
              value: 1,
            },
            {
              action: 'set',
              to: 'value',
              value: 'one',
              where: {
                field: 'format',
                eq: 'text',
              },
            },
            {
              action: 'set',
              to: 'value',
              value: true,
              where: {
                field: 'format',
                eq: 'bool',
              },
            },
          ],
        };

        const result = validateStreamlang(dsl, { validateTypes: true });

        expect(result.isValid).toBe(false);
        const mixedErrors = result.errors.filter(
          (e) => e.type === 'mixed_type' && e.field === 'value'
        );
        expect(mixedErrors.length).toBeGreaterThanOrEqual(1);
        // Check that we've accumulated all three types
        const allConflictingTypes = mixedErrors.flatMap((e) => e.conflictingTypes || []);
        expect(allConflictingTypes).toEqual(
          expect.arrayContaining(['number', 'string', 'boolean'])
        );
      });
    });

    describe('field type persistence after conditional modification', () => {
      it('should preserve original type for downstream processors after conditional modification', () => {
        const dsl: StreamlangDSL = {
          steps: [
            {
              action: 'set',
              to: 'myfield',
              value: 42, // Number
            },
            {
              action: 'set',
              to: 'myfield',
              value: 'hello', // Conditionally string
              where: {
                field: 'condition',
                eq: true,
              },
            },
            {
              action: 'replace',
              from: 'myfield', // Expects string, but myfield might still be number
              pattern: 'test',
              replacement: 'replaced',
            },
          ],
        };

        const result = validateStreamlang(dsl, { validateTypes: true });

        // Should have both mixed type error AND type mismatch error
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.type === 'mixed_type')).toBe(true);
        // The replace processor should still see myfield as potentially a number
        // because the set is conditional
        expect(result.errors.some((e) => e.type === 'type_mismatch' && e.field === 'myfield')).toBe(
          true
        );
      });
    });
  });
});
