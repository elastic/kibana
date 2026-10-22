/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getConvertType,
  getGeneratedProcessorField,
  readBackFieldTypeProcessors,
  stripFieldTypeProcessors,
  syncFieldTypeProcessors,
} from './field_type_processors';

const USER_PROCESSOR = { set: { field: 'event.kind', value: 'event' } };

describe('getConvertType', () => {
  it('converts strings to the edited numeric, boolean, or ip type', () => {
    expect(getConvertType('keyword', 'long')).toBe('long');
    expect(getConvertType('keyword', 'integer')).toBe('integer');
    expect(getConvertType('keyword', 'short')).toBe('integer');
    expect(getConvertType('keyword', 'byte')).toBe('integer');
    expect(getConvertType('keyword', 'half_float')).toBe('float');
    expect(getConvertType('keyword', 'float')).toBe('float');
    expect(getConvertType('keyword', 'double')).toBe('double');
    expect(getConvertType('keyword', 'boolean')).toBe('boolean');
    expect(getConvertType('keyword', 'ip')).toBe('ip');
  });

  it('converts numbers and booleans to string for keyword-like types', () => {
    expect(getConvertType('long', 'keyword')).toBe('string');
    expect(getConvertType('double', 'wildcard')).toBe('string');
    expect(getConvertType('boolean', 'match_only_text')).toBe('string');
  });

  it('needs no processor for dates, unsigned_long, or same-family changes', () => {
    expect(getConvertType('keyword', 'date')).toBeUndefined();
    expect(getConvertType('keyword', 'unsigned_long')).toBeUndefined();
    expect(getConvertType('long', 'short')).toBeUndefined();
    expect(getConvertType('keyword', 'wildcard')).toBeUndefined();
    expect(getConvertType('long', 'boolean')).toBeUndefined();
  });
});

describe('syncFieldTypeProcessors', () => {
  it('appends a tagged convert processor after the user processors', () => {
    const pipeline = syncFieldTypeProcessors(
      { description: 'test', processors: [USER_PROCESSOR] },
      [{ name: 'source.bytes', type: 'long', original_type: 'keyword' }],
      [{ source: { bytes: '12' } }]
    );

    expect(pipeline).toEqual({
      description: 'test',
      processors: [
        USER_PROCESSOR,
        {
          convert: {
            description:
              'Converts source.bytes to match its long field type. Managed by Automatic Import.',
            tag: 'automatic_import_field_type:source.bytes',
            field: 'source.bytes',
            type: 'long',
            ignore_missing: true,
          },
        },
      ],
    });
  });

  it('skips edits that need no processor', () => {
    const pipeline = syncFieldTypeProcessors(
      { processors: [USER_PROCESSOR] },
      [{ name: 'event.created', type: 'date', original_type: 'keyword' }],
      []
    );
    expect(pipeline.processors).toEqual([USER_PROCESSOR]);
  });

  it('wraps the convert in foreach processors for arrays of objects', () => {
    const pipeline = syncFieldTypeProcessors(
      { processors: [] },
      [{ name: 'vendor.items.ports.number', type: 'long', original_type: 'keyword' }],
      [{ vendor: { items: [{ ports: [{ number: '80' }, { number: '443' }] }] } }]
    );

    expect(pipeline.processors).toEqual([
      {
        foreach: {
          description:
            'Converts vendor.items.ports.number to match its long field type. Managed by Automatic Import.',
          tag: 'automatic_import_field_type:vendor.items.ports.number',
          field: 'vendor.items',
          ignore_missing: true,
          processor: {
            foreach: {
              tag: 'automatic_import_field_type:vendor.items.ports.number',
              field: '_ingest._value.ports',
              ignore_missing: true,
              processor: {
                convert: {
                  tag: 'automatic_import_field_type:vendor.items.ports.number',
                  field: '_ingest._value.number',
                  type: 'long',
                  ignore_missing: true,
                },
              },
            },
          },
        },
      },
    ]);
  });

  it('converts arrays of plain values without foreach', () => {
    const pipeline = syncFieldTypeProcessors(
      { processors: [] },
      [{ name: 'vendor.ports', type: 'long', original_type: 'keyword' }],
      [{ vendor: { ports: ['80', '443'] } }]
    );
    expect(pipeline.processors).toEqual([
      expect.objectContaining({ convert: expect.objectContaining({ field: 'vendor.ports' }) }),
    ]);
  });

  it('keeps user settings on a generated processor but restores the managed keys', () => {
    const pipeline = syncFieldTypeProcessors(
      {
        processors: [
          {
            convert: {
              tag: 'automatic_import_field_type:source.bytes',
              field: 'renamed',
              type: 'long',
              target_field: 'other',
              if: 'ctx.source != null',
              description: 'Mine',
            },
          },
          USER_PROCESSOR,
        ],
      },
      [{ name: 'source.bytes', type: 'double', original_type: 'keyword' }],
      []
    );

    expect(pipeline.processors).toEqual([
      USER_PROCESSOR,
      {
        convert: {
          description: 'Mine',
          if: 'ctx.source != null',
          tag: 'automatic_import_field_type:source.bytes',
          field: 'source.bytes',
          type: 'double',
          ignore_missing: true,
        },
      },
    ]);
  });

  it('rewrites a generated description for the current type and replaces the old text', () => {
    const generated = (description: string) => ({
      processors: [
        {
          convert: {
            tag: 'automatic_import_field_type:source.bytes',
            field: 'source.bytes',
            type: 'long',
            description,
          },
        },
      ],
    });
    const fieldTypes = [{ name: 'source.bytes', type: 'double', original_type: 'keyword' }];
    const expected =
      'Converts source.bytes to match its double field type. Managed by Automatic Import.';

    for (const description of [
      'Generated from the field type in the Table tab.',
      'Converts source.bytes to match its long field type. Managed by Automatic Import.',
    ]) {
      const [processor] = syncFieldTypeProcessors(generated(description), fieldTypes, [])
        .processors as Array<{ convert: { description: string } }>;
      expect(processor.convert.description).toBe(expected);
    }
  });

  it('rewrites a generated description for a field name with spaces', () => {
    const [processor] = syncFieldTypeProcessors(
      {
        processors: [
          {
            convert: {
              tag: 'automatic_import_field_type:user agent',
              field: 'user agent',
              type: 'long',
              description:
                'Converts user agent to match its long field type. Managed by Automatic Import.',
            },
          },
        ],
      },
      [{ name: 'user agent', type: 'double', original_type: 'keyword' }],
      []
    ).processors as Array<{ convert: { description: string } }>;

    expect(processor.convert.description).toBe(
      'Converts user agent to match its double field type. Managed by Automatic Import.'
    );
  });

  it('drops generated processors for fields without an edit', () => {
    const pipeline = syncFieldTypeProcessors(
      {
        processors: [
          { convert: { tag: 'automatic_import_field_type:stale', field: 'stale', type: 'long' } },
        ],
      },
      [],
      []
    );
    expect(pipeline.processors).toEqual([]);
  });
});

describe('stripFieldTypeProcessors', () => {
  it('removes only processors with a generated tag', () => {
    const userTagged = { convert: { tag: 'mine', field: 'a', type: 'long' } };
    const pipeline = stripFieldTypeProcessors({
      processors: [
        USER_PROCESSOR,
        userTagged,
        { convert: { tag: 'automatic_import_field_type:b', field: 'b', type: 'long' } },
      ],
    });
    expect(pipeline.processors).toEqual([USER_PROCESSOR, userTagged]);
  });
});

describe('getGeneratedProcessorField', () => {
  it('reads the field name from the tag', () => {
    expect(
      getGeneratedProcessorField({ foreach: { tag: 'automatic_import_field_type:a.b' } })
    ).toBe('a.b');
    expect(getGeneratedProcessorField({ convert: { tag: 'automatic_import_field_type:' } })).toBe(
      undefined
    );
    expect(getGeneratedProcessorField(USER_PROCESSOR)).toBeUndefined();
    expect(getGeneratedProcessorField('not a processor')).toBeUndefined();
  });
});

describe('readBackFieldTypeProcessors', () => {
  const fieldTypes = [{ name: 'source.bytes', type: 'long', original_type: 'keyword' }];
  const convert = (type: string) => ({
    convert: { tag: 'automatic_import_field_type:source.bytes', field: 'source.bytes', type },
  });

  it('reports no changes when the generated processor matches', () => {
    expect(readBackFieldTypeProcessors({ processors: [convert('long')] }, fieldTypes)).toEqual({
      changes: [],
      errors: [],
    });
  });

  it('reverts the field when its processor is deleted', () => {
    expect(readBackFieldTypeProcessors({ processors: [USER_PROCESSOR] }, fieldTypes)).toEqual({
      changes: [{ name: 'source.bytes', type: 'keyword' }],
      errors: [],
    });
  });

  it('ignores missing processors for edits that need none', () => {
    expect(
      readBackFieldTypeProcessors({ processors: [] }, [
        { name: 'event.created', type: 'date', original_type: 'keyword' },
      ])
    ).toEqual({ changes: [], errors: [] });
  });

  it('maps a changed convert type back to a field type', () => {
    expect(readBackFieldTypeProcessors({ processors: [convert('double')] }, fieldTypes)).toEqual({
      changes: [{ name: 'source.bytes', type: 'double' }],
      errors: [],
    });
    expect(readBackFieldTypeProcessors({ processors: [convert('string')] }, fieldTypes)).toEqual({
      changes: [{ name: 'source.bytes', type: 'keyword' }],
      errors: [],
    });
  });

  it('keeps a narrower type that still matches the convert type', () => {
    expect(
      readBackFieldTypeProcessors({ processors: [convert('integer')] }, [
        { name: 'source.bytes', type: 'short', original_type: 'keyword' },
      ])
    ).toEqual({ changes: [], errors: [] });
  });

  it('reads the convert type inside foreach wrappers', () => {
    const processor = {
      foreach: {
        tag: 'automatic_import_field_type:source.bytes',
        field: 'source',
        processor: convert('double'),
      },
    };
    expect(readBackFieldTypeProcessors({ processors: [processor] }, fieldTypes).changes).toEqual([
      { name: 'source.bytes', type: 'double' },
    ]);
  });

  it('rejects convert types that do not map to a field type', () => {
    expect(readBackFieldTypeProcessors({ processors: [convert('auto')] }, fieldTypes)).toEqual({
      changes: [],
      errors: [{ name: 'source.bytes', issue: 'invalid_convert_type' }],
    });
  });

  it('reports invalid generated processors even for fields that are not read back', () => {
    expect(readBackFieldTypeProcessors({ processors: [convert('auto')] }, [])).toEqual({
      changes: [],
      errors: [{ name: 'source.bytes', issue: 'invalid_convert_type' }],
    });
  });

  it('rejects duplicate generated processors for one field', () => {
    expect(
      readBackFieldTypeProcessors({ processors: [convert('long'), convert('long')] }, fieldTypes)
    ).toEqual({
      changes: [],
      errors: [{ name: 'source.bytes', issue: 'duplicate_generated_processor' }],
    });
  });

  describe('with a field mapping', () => {
    const fieldMapping = [
      { name: 'source.bytes', type: 'keyword', is_ecs: false },
      { name: 'source.port', type: 'long', is_ecs: true },
      { name: 'vendor', type: 'group', is_ecs: false },
      { name: 'vendor.count', type: 'long', is_ecs: false },
    ];
    const generatedFor = (field: string, type: string) => ({
      convert: { tag: `automatic_import_field_type:${field}`, field, type },
    });

    it('reads a hand-added generated processor as a type change', () => {
      expect(
        readBackFieldTypeProcessors({ processors: [convert('long')] }, [], { fieldMapping })
      ).toEqual({ changes: [{ name: 'source.bytes', type: 'long' }], errors: [] });
    });

    it('rejects hand-added processors that cannot change the field type', () => {
      const processors = [
        generatedFor('source.port', 'string'),
        generatedFor('vendor', 'long'),
        generatedFor('vendor.count', 'integer'),
        generatedFor('missing', 'long'),
      ];
      expect(readBackFieldTypeProcessors({ processors }, [], { fieldMapping })).toEqual({
        changes: [],
        errors: ['source.port', 'vendor', 'vendor.count', 'missing'].map((name) => ({
          name,
          issue: 'unsupported_generated_processor',
        })),
      });
    });

    it('skips edited and skipped fields', () => {
      expect(
        readBackFieldTypeProcessors({ processors: [convert('long')] }, fieldTypes, {
          fieldMapping,
        })
      ).toEqual({ changes: [], errors: [] });
      expect(
        readBackFieldTypeProcessors({ processors: [convert('long')] }, [], {
          fieldMapping,
          skipFields: new Set(['source.bytes']),
        })
      ).toEqual({ changes: [], errors: [] });
    });
  });
});
