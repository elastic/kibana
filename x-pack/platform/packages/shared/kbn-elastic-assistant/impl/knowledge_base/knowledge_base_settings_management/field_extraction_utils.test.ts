/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractSearchableFields, extractAllFields } from './field_extraction_utils';

describe('field_extraction_utils', () => {
  describe('extractSearchableFields', () => {
    it('should return empty array when mappings is undefined', () => {
      const result = extractSearchableFields({});
      expect(result).toEqual([]);
    });

    it('should return empty array when properties is undefined', () => {
      const result = extractSearchableFields({ mappings: {} });
      expect(result).toEqual([]);
    });

    it('should extract simple text fields', () => {
      const mappings = {
        mappings: {
          properties: {
            title: { type: 'text' as const },
            description: { type: 'text' as const },
            category: { type: 'keyword' as const },
          },
        },
      };

      const result = extractSearchableFields(mappings);
      expect(result).toEqual([
        { name: 'title', type: 'text', fullPath: 'title' },
        { name: 'description', type: 'text', fullPath: 'description' },
      ]);
    });

    it('should extract semantic_text fields', () => {
      const mappings = {
        mappings: {
          properties: {
            content: { type: 'semantic_text' as const, inference_id: 'my-model' },
            summary: { type: 'text' as const },
          },
        },
      };

      const result = extractSearchableFields(mappings);
      expect(result).toEqual([
        { name: 'content', type: 'semantic_text', fullPath: 'content' },
        { name: 'summary', type: 'text', fullPath: 'summary' },
      ]);
    });

    it('should extract multi-fields (fields property)', () => {
      const mappings = {
        mappings: {
          properties: {
            executable: {
              type: 'keyword' as const,
              ignore_above: 1024,
              fields: {
                caseless: {
                  type: 'keyword' as const,
                  ignore_above: 1024,
                  normalizer: 'lowercase',
                },
                text: {
                  type: 'text' as const,
                },
              },
            },
          },
        },
      };

      const result = extractSearchableFields(mappings);
      expect(result).toEqual([{ name: 'text', type: 'text', fullPath: 'executable.text' }]);
    });

    it('should extract nested object properties', () => {
      const mappings = {
        mappings: {
          properties: {
            user: {
              type: 'object' as const,
              properties: {
                name: { type: 'text' as const },
                email: { type: 'keyword' as const },
                profile: {
                  type: 'object' as const,
                  properties: {
                    bio: { type: 'text' as const },
                    age: { type: 'integer' as const },
                  },
                },
              },
            },
          },
        },
      };

      const result = extractSearchableFields(mappings);
      expect(result).toEqual([
        { name: 'name', type: 'text', fullPath: 'user.name' },
        { name: 'bio', type: 'text', fullPath: 'user.profile.bio' },
      ]);
    });

    it('should handle complex nested structures with multi-fields', () => {
      const mappings = {
        mappings: {
          properties: {
            Events: {
              type: 'object' as const,
              properties: {
                executable: {
                  type: 'keyword' as const,
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword' as const,
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text' as const,
                    },
                  },
                },
                process: {
                  type: 'object' as const,
                  properties: {
                    name: {
                      type: 'keyword' as const,
                      fields: {
                        text: { type: 'text' as const },
                      },
                    },
                    command_line: { type: 'text' as const },
                  },
                },
              },
            },
          },
        },
      };

      const result = extractSearchableFields(mappings);
      expect(result).toEqual([
        { name: 'text', type: 'text', fullPath: 'Events.executable.text' },
        { name: 'text', type: 'text', fullPath: 'Events.process.name.text' },
        { name: 'command_line', type: 'text', fullPath: 'Events.process.command_line' },
      ]);
    });

    it('should handle the reported issue scenario', () => {
      const mappings = {
        mappings: {
          properties: {
            executable: {
              type: 'keyword' as const,
              ignore_above: 1024,
              fields: {
                caseless: {
                  type: 'keyword' as const,
                  ignore_above: 1024,
                  normalizer: 'lowercase',
                },
                text: {
                  type: 'text' as const,
                },
              },
            },
          },
        },
      };

      const result = extractSearchableFields(mappings);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'text',
        type: 'text',
        fullPath: 'executable.text',
      });
    });
  });

  describe('extractAllFields', () => {
    it('should extract all field types', () => {
      const mappings = {
        mappings: {
          properties: {
            title: { type: 'text' as const },
            category: { type: 'keyword' as const },
            count: { type: 'integer' as const },
            timestamp: { type: 'date' as const },
          },
        },
      };

      const result = extractAllFields(mappings);
      expect(result).toEqual([
        { name: 'title', type: 'text', fullPath: 'title' },
        { name: 'category', type: 'keyword', fullPath: 'category' },
        { name: 'count', type: 'integer', fullPath: 'count' },
        { name: 'timestamp', type: 'date', fullPath: 'timestamp' },
      ]);
    });

    it('should extract all multi-fields regardless of type', () => {
      const mappings = {
        mappings: {
          properties: {
            executable: {
              type: 'keyword' as const,
              ignore_above: 1024,
              fields: {
                caseless: {
                  type: 'keyword' as const,
                  ignore_above: 1024,
                  normalizer: 'lowercase',
                },
                text: {
                  type: 'text' as const,
                },
              },
            },
          },
        },
      };

      const result = extractAllFields(mappings);
      expect(result).toEqual([
        { name: 'executable', type: 'keyword', fullPath: 'executable' },
        { name: 'caseless', type: 'keyword', fullPath: 'executable.caseless' },
        { name: 'text', type: 'text', fullPath: 'executable.text' },
      ]);
    });

    it('should extract all nested fields regardless of type', () => {
      const mappings = {
        mappings: {
          properties: {
            Events: {
              type: 'object' as const,
              properties: {
                executable: { type: 'keyword' as const },
                process: {
                  type: 'object' as const,
                  properties: {
                    pid: { type: 'integer' as const },
                    name: { type: 'text' as const },
                  },
                },
              },
            },
          },
        },
      };

      const result = extractAllFields(mappings);
      expect(result).toEqual([
        { name: 'Events', type: 'object', fullPath: 'Events' },
        { name: 'executable', type: 'keyword', fullPath: 'Events.executable' },
        { name: 'process', type: 'object', fullPath: 'Events.process' },
        { name: 'pid', type: 'integer', fullPath: 'Events.process.pid' },
        { name: 'name', type: 'text', fullPath: 'Events.process.name' },
      ]);
    });
  });

  describe('edge cases', () => {
    it('should handle fields without type property', () => {
      const mappings = {
        mappings: {
          properties: {
            validField: { type: 'text' as const },
            // Object field without explicit type (valid in ES mappings)
            objectWithoutType: {
              properties: {
                nestedText: { type: 'text' as const },
              },
            },
          },
        },
      };

      const searchableResult = extractSearchableFields(mappings);
      const allResult = extractAllFields(mappings);

      expect(searchableResult).toEqual([
        { name: 'validField', type: 'text', fullPath: 'validField' },
        { name: 'nestedText', type: 'text', fullPath: 'objectWithoutType.nestedText' },
      ]);
      expect(allResult).toEqual([
        { name: 'validField', type: 'text', fullPath: 'validField' },
        { name: 'nestedText', type: 'text', fullPath: 'objectWithoutType.nestedText' },
      ]);
    });

    it('should handle empty properties objects', () => {
      const mappings = {
        mappings: {
          properties: {
            emptyObject: {
              type: 'object' as const,
              properties: {},
            },
            validField: { type: 'text' as const },
          },
        },
      };

      const result = extractSearchableFields(mappings);
      expect(result).toEqual([{ name: 'validField', type: 'text', fullPath: 'validField' }]);
    });

    it('should handle empty fields objects', () => {
      const mappings = {
        mappings: {
          properties: {
            fieldWithEmptyFields: {
              type: 'keyword' as const,
              fields: {},
            },
            validField: { type: 'text' as const },
          },
        },
      };

      const result = extractSearchableFields(mappings);
      expect(result).toEqual([{ name: 'validField', type: 'text', fullPath: 'validField' }]);
    });
  });
});
