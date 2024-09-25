/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { omit } from 'lodash/fp';

import { EnrichedFieldMetadata, PartitionedFieldMetadata, UnallowedValueCount } from '../types';
import { mockMappingsProperties } from '../mock/mappings_properties/mock_mappings_properties';
import {
  FieldType,
  getEnrichedFieldMetadata,
  getFieldTypes,
  getMappingsProperties,
  getMissingTimestampFieldMetadata,
  getPartitionedFieldMetadata,
  getSortedPartitionedFieldMetadata,
  isMappingCompatible,
} from './metadata';
import { EcsFlatTyped } from '../constants';
import {
  hostNameWithTextMapping,
  hostNameKeyword,
  someField,
  someFieldKeyword,
  sourceIpWithTextMapping,
  sourceIpKeyword,
  sourcePort,
  timestamp,
  eventCategoryWithUnallowedValues,
} from '../mock/enriched_field_metadata/mock_enriched_field_metadata';
import { mockIndicesGetMappingIndexMappingRecords } from '../mock/indices_get_mapping_index_mapping_record/mock_indices_get_mapping_index_mapping_record';

describe('getFieldTypes', () => {
  const expected = [
    {
      field: '@timestamp',
      type: 'date',
    },
    {
      field: 'event.category',
      type: 'keyword',
    },
    {
      field: 'host.name',
      type: 'text',
    },
    {
      field: 'host.name.keyword',
      type: 'keyword',
    },
    {
      field: 'some.field',
      type: 'text',
    },
    {
      field: 'some.field.keyword',
      type: 'keyword',
    },
    {
      field: 'source.ip',
      type: 'text',
    },
    {
      field: 'source.ip.keyword',
      type: 'keyword',
    },
    {
      field: 'source.port',
      type: 'long',
    },
  ];

  test('it flattens the field names and types in the mapping properties', () => {
    expect(getFieldTypes(mockMappingsProperties)).toEqual(expected);
  });

  test('it throws a type error when mappingsProperties is not flatten-able', () => {
    // @ts-expect-error
    const invalidType: Record<string, unknown> = []; // <-- this is an array, NOT a valid Record<string, unknown>

    expect(() => getFieldTypes(invalidType)).toThrowError('Root value is not flatten-able');
  });
});

describe('isMappingCompatible', () => {
  test('it returns true for an exact match', () => {
    expect(isMappingCompatible({ ecsExpectedType: 'keyword', type: 'keyword' })).toBe(true);
  });

  test("it returns false when both types don't exactly match", () => {
    expect(isMappingCompatible({ ecsExpectedType: 'wildcard', type: 'keyword' })).toBe(false);
  });
});

describe('getEnrichedFieldMetadata', () => {
  /**
   * The ECS schema
   * https://raw.githubusercontent.com/elastic/ecs/main/generated/ecs/ecs_flat.yml
   * defines a handful of fields that have `allowed_values`. For these
   * fields, the documents in an index should only have specific values.
   *
   * This instance of the type `Record<string, UnallowedValueCount[]>`
   * represents an index that doesn't have any unallowed values, for the
   * specified keys in the map, i.e. `event.category`, `event.kind`, etc.
   *
   * This will be used to test the happy path. Variants of this
   * value will be used to test unhappy paths.
   */
  const noUnallowedValues: Record<string, UnallowedValueCount[]> = {
    'event.category': [],
    'event.kind': [],
    'event.outcome': [],
    'event.type': [],
  };

  /**
   * Represents an index that has unallowed values, for the
   * `event.category` field. The other fields in the collection,
   *  i.e. `event.kind`, don't have any unallowed values.
   *
   * This instance will be used to test paths where a field is
   * NOT ECS complaint, because the index has unallowed values.
   */
  const unallowedValues: Record<string, UnallowedValueCount[]> = {
    'event.category': [
      {
        count: 2,
        fieldName: 'an_invalid_category',
      },
      {
        count: 1,
        fieldName: 'theory',
      },
    ],
    'event.kind': [],
    'event.outcome': [],
    'event.type': [],
  };

  /**
   * This instance of a `FieldType` has the correct mapping for the
   * `event.category` field.
   *
   * This instance will be used to test paths where the index has
   * a valid mapping for the `event.category` field.
   */
  const fieldMetadataCorrectMappingType: FieldType = {
    field: 'event.category',
    type: 'keyword', // <-- this index has the correct mapping type
  };

  /**
   * This `EnrichedFieldMetadata` for the `event.category` field,
   * represents a happy path result, where the index being checked:
   *
   * 1) The `type` of the field in the index, `keyword`, matches the expected
   *    `type` of the `event.category` field, as defined by the `EcsMetadata`
   * 2) The index doesn't have any unallowed values for the `event.category` field
   *
   * Since this is a happy path result, it has the following values:
   * `indexInvalidValues` is an empty array, because the index does not contain any invalid values
   * `isEcsCompliant` is true, because the index has the expected mapping type, and no unallowed values
   */
  const happyPathResultSample: EnrichedFieldMetadata = {
    dashed_name: 'event-category',
    description:
      'This is one of four ECS Categorization Fields, and indicates the second level in the ECS category hierarchy.\n`event.category` represents the "big buckets" of ECS categories. For example, filtering on `event.category:process` yields all events relating to process activity. This field is closely related to `event.type`, which is used as a subcategory.\nThis field is an array. This will allow proper categorization of some events that fall in multiple categories.',
    example: 'authentication',
    flat_name: 'event.category',
    ignore_above: 1024,
    level: 'core',
    name: 'category',
    normalize: ['array'],
    short: 'Event category. The second categorization field in the hierarchy.',
    type: 'keyword',
    indexFieldName: 'event.category',
    indexFieldType: 'keyword', // a valid mapping, because the `type` property from the `ecsMetadata` is also `keyword`
    indexInvalidValues: [], // empty array, because the index does not contain any invalid values
    hasEcsMetadata: true,
    isEcsCompliant: true, // because the index has the expected mapping type, and no unallowed values
    isInSameFamily: false,
  };

  /**
   * Creates expected result matcher based on the happy path result sample. Please, add similar `expect` based assertions to it if anything breaks
   * with an ECS upgrade, instead of hardcoding the values.
   */
  const expectedResult = (extraFields: Record<string, unknown> = {}) =>
    expect.objectContaining({
      ...happyPathResultSample,
      ...extraFields,
      allowed_values: expect.arrayContaining([
        expect.objectContaining({
          description: expect.any(String),
          name: expect.any(String),
          expected_event_types: expect.any(Array),
        }),
      ]),
    });

  test('it returns the happy path result when the index has no mapping conflicts, and no unallowed values', () => {
    expect(
      getEnrichedFieldMetadata({
        ecsMetadata: EcsFlatTyped,
        fieldMetadata: fieldMetadataCorrectMappingType, // no mapping conflicts for `event.category` in this index
        unallowedValues: noUnallowedValues, // no unallowed values for `event.category` in this index
      })
    ).toEqual(expectedResult());
  });

  test('it returns the happy path result when the index has no mapping conflicts, and the unallowedValues map does not contain an entry for the field', () => {
    // create an `unallowedValues` that doesn't have an entry for `event.category`:
    const noEntryForEventCategory: Record<string, UnallowedValueCount[]> = omit(
      'event.category',
      unallowedValues
    );

    expect(
      getEnrichedFieldMetadata({
        ecsMetadata: EcsFlatTyped,
        fieldMetadata: fieldMetadataCorrectMappingType, // no mapping conflicts for `event.category` in this index
        unallowedValues: noEntryForEventCategory, // a lookup in this map for the `event.category` field will return undefined
      })
    ).toEqual(expectedResult());
  });

  test('it returns a result with the expected `indexInvalidValues` and `isEcsCompliant` when the index has no mapping conflict, but it has unallowed values', () => {
    expect(
      getEnrichedFieldMetadata({
        ecsMetadata: EcsFlatTyped,
        fieldMetadata: fieldMetadataCorrectMappingType, // no mapping conflicts for `event.category` in this index
        unallowedValues, // this index has unallowed values for the event.category field
      })
    ).toEqual(
      expectedResult({
        indexInvalidValues: [
          {
            count: 2,
            fieldName: 'an_invalid_category',
          },
          {
            count: 1,
            fieldName: 'theory',
          },
        ],
        isEcsCompliant: false, // because there are unallowed values
      })
    );
  });

  test('it returns a result with the expected `isEcsCompliant` and `isInSameFamily` when the index type does not match ECS, but NO unallowed values', () => {
    const indexFieldType = 'text';

    expect(
      getEnrichedFieldMetadata({
        ecsMetadata: EcsFlatTyped,
        fieldMetadata: {
          field: 'event.category', // `event.category` is a `keyword`, per the ECS spec
          type: indexFieldType, // this index has a mapping of `text` instead
        },
        unallowedValues: noUnallowedValues, // no unallowed values for `event.category` in this index
      })
    ).toEqual(
      expectedResult({
        indexFieldType,
        isEcsCompliant: false, // `keyword` !== `text`
        isInSameFamily: false, // `keyword` and `text` are not in the same family
      })
    );
  });

  test('it returns a result with the expected `isEcsCompliant` and `isInSameFamily` when the mapping is is in the same family', () => {
    const indexFieldType = 'wildcard';

    expect(
      getEnrichedFieldMetadata({
        ecsMetadata: EcsFlatTyped,
        fieldMetadata: {
          field: 'event.category', // `event.category` is a `keyword` per the ECS spec
          type: indexFieldType, // this index has a mapping of `wildcard` instead
        },
        unallowedValues: noUnallowedValues, // no unallowed values for `event.category` in this index
      })
    ).toEqual(
      expectedResult({
        indexFieldType,
        isEcsCompliant: false, // `wildcard` !== `keyword`
        isInSameFamily: true, // `wildcard` and `keyword` are in the same family
      })
    );
  });

  test('it returns a result with the expected `indexInvalidValues`,`isEcsCompliant`, and `isInSameFamily` when the index has BOTH mapping conflicts, and unallowed values', () => {
    const indexFieldType = 'text';

    expect(
      getEnrichedFieldMetadata({
        ecsMetadata: EcsFlatTyped,
        fieldMetadata: {
          field: 'event.category', // `event.category` is a `keyword` per the ECS spec
          type: indexFieldType, // this index has a mapping of `text` instead
        },
        unallowedValues, // this index also has unallowed values for the event.category field
      })
    ).toEqual(
      expectedResult({
        indexFieldType,
        indexInvalidValues: [
          {
            count: 2,
            fieldName: 'an_invalid_category',
          },
          {
            count: 1,
            fieldName: 'theory',
          },
        ],
        isEcsCompliant: false, // because there are BOTH mapping conflicts and unallowed values
        isInSameFamily: false, // `text` and `keyword` are not in the same family
      })
    );
  });

  test('it returns the expected result for a custom field, i.e. a field that does NOT have an entry in `ecsMetadata`', () => {
    const field = 'a_custom_field'; // not defined by ECS
    const indexFieldType = 'keyword';

    expect(
      getEnrichedFieldMetadata({
        ecsMetadata: EcsFlatTyped,
        fieldMetadata: {
          field,
          type: indexFieldType, // no mapping conflict, because ECS doesn't define this field
        },
        unallowedValues: noUnallowedValues, // no unallowed values for `a_custom_field` in this index
      })
    ).toEqual({
      indexFieldName: field,
      indexFieldType,
      indexInvalidValues: [],
      hasEcsMetadata: false,
      isEcsCompliant: false,
      isInSameFamily: false, // custom fields are never in the same family
    });
  });
});

describe('getMissingTimestampFieldMetadata', () => {
  test('it returns the expected `EnrichedFieldMetadata`', () => {
    expect(getMissingTimestampFieldMetadata()).toEqual({
      ...EcsFlatTyped['@timestamp'],
      hasEcsMetadata: true,
      indexFieldName: '@timestamp',
      indexFieldType: '-', // the index did NOT define a mapping for @timestamp
      indexInvalidValues: [],
      isEcsCompliant: false, // an index must define the @timestamp mapping
      isInSameFamily: false, // `date` is not a member of any families
    });
  });
});

describe('getPartitionedFieldMetadata', () => {
  test('it places all the `EnrichedFieldMetadata` in the expected categories', () => {
    const enrichedFieldMetadata: EnrichedFieldMetadata[] = [
      timestamp,
      eventCategoryWithUnallowedValues,
      hostNameWithTextMapping,
      hostNameKeyword,
      someField,
      someFieldKeyword,
      sourceIpWithTextMapping,
      sourceIpKeyword,
      sourcePort,
    ];
    const expected: PartitionedFieldMetadata = {
      all: [
        timestamp,
        eventCategoryWithUnallowedValues,
        hostNameWithTextMapping,
        hostNameKeyword,
        someField,
        someFieldKeyword,
        sourceIpWithTextMapping,
        sourceIpKeyword,
        sourcePort,
      ],
      ecsCompliant: [timestamp, sourcePort],
      custom: [hostNameKeyword, someField, someFieldKeyword, sourceIpKeyword],
      incompatible: [
        eventCategoryWithUnallowedValues,
        hostNameWithTextMapping,
        sourceIpWithTextMapping,
      ],
      sameFamily: [],
    };

    expect(getPartitionedFieldMetadata(enrichedFieldMetadata)).toEqual(expected);
  });
});

describe('getSortedPartitionedFieldMetadata', () => {
  test('it returns null when mappings are loading', () => {
    expect(
      getSortedPartitionedFieldMetadata({
        ecsMetadata: EcsFlatTyped,
        loadingMappings: true, // <--
        mappingsProperties: mockMappingsProperties,
        unallowedValues: {},
      })
    ).toBeNull();
  });

  test('it returns null when `unallowedValues` is null', () => {
    expect(
      getSortedPartitionedFieldMetadata({
        ecsMetadata: EcsFlatTyped,
        loadingMappings: false,
        mappingsProperties: mockMappingsProperties,
        unallowedValues: null, // <--
      })
    ).toBeNull();
  });

  describe('when `mappingsProperties` is unknown', () => {
    const incompatibleFieldMetadata = {
      ...EcsFlatTyped['@timestamp'],
      hasEcsMetadata: true,
      indexFieldName: '@timestamp',
      indexFieldType: '-',
      indexInvalidValues: [],
      isEcsCompliant: false,
      isInSameFamily: false,
    };
    const expected = {
      all: [incompatibleFieldMetadata],
      custom: [],
      ecsCompliant: [],
      incompatible: [incompatibleFieldMetadata],
      sameFamily: [],
    };

    test('it returns a `PartitionedFieldMetadata` with an `incompatible` `@timestamp` when  `mappingsProperties` is undefined', () => {
      expect(
        getSortedPartitionedFieldMetadata({
          ecsMetadata: EcsFlatTyped,
          loadingMappings: false,
          mappingsProperties: undefined, // <--
          unallowedValues: {},
        })
      ).toEqual(expected);
    });

    test('it returns a `PartitionedFieldMetadata` with an `incompatible` `@timestamp` when  `mappingsProperties` is null', () => {
      expect(
        getSortedPartitionedFieldMetadata({
          ecsMetadata: EcsFlatTyped,
          loadingMappings: false,
          mappingsProperties: null, // <--
          unallowedValues: {},
        })
      ).toEqual(expected);
    });
  });

  test('it returns the expected sorted field metadata', () => {
    const unallowedValues = {
      'event.category': [
        {
          count: 2,
          fieldName: 'an_invalid_category',
        },
        {
          count: 1,
          fieldName: 'theory',
        },
      ],
      'event.kind': [],
      'event.outcome': [],
      'event.type': [],
    };

    expect(
      getSortedPartitionedFieldMetadata({
        ecsMetadata: EcsFlatTyped,
        loadingMappings: false,
        mappingsProperties: mockMappingsProperties,
        unallowedValues,
      })
    ).toMatchObject({
      all: expect.arrayContaining([
        expect.objectContaining({
          name: expect.any(String),
          flat_name: expect.any(String),
          dashed_name: expect.any(String),
          description: expect.any(String),
          hasEcsMetadata: true,
          isEcsCompliant: expect.any(Boolean),
          isInSameFamily: expect.any(Boolean),
        }),
      ]),
      ecsCompliant: expect.arrayContaining([
        expect.objectContaining({
          name: expect.any(String),
          flat_name: expect.any(String),
          dashed_name: expect.any(String),
          description: expect.any(String),
          hasEcsMetadata: true,
          isEcsCompliant: true,
          isInSameFamily: false,
        }),
      ]),
      custom: expect.arrayContaining([
        expect.objectContaining({
          indexFieldName: expect.any(String),
          indexFieldType: expect.any(String),
          indexInvalidValues: expect.any(Array),
          hasEcsMetadata: expect.any(Boolean),
          isEcsCompliant: expect.any(Boolean),
          isInSameFamily: expect.any(Boolean),
        }),
      ]),
      incompatible: expect.arrayContaining([
        expect.objectContaining({
          name: expect.any(String),
          flat_name: expect.any(String),
          dashed_name: expect.any(String),
          description: expect.any(String),
          hasEcsMetadata: expect.any(Boolean),
          isEcsCompliant: false,
          isInSameFamily: false,
        }),
      ]),
      sameFamily: [],
    });
  });
});

describe('getMappingsProperties', () => {
  test('it returns the expected mapping properties', () => {
    expect(
      getMappingsProperties({
        indexes: mockIndicesGetMappingIndexMappingRecords,
        indexName: 'auditbeat-custom-index-1',
      })
    ).toEqual({
      '@timestamp': {
        type: 'date',
      },
      event: {
        properties: {
          category: {
            ignore_above: 1024,
            type: 'keyword',
          },
        },
      },
      host: {
        properties: {
          name: {
            fields: {
              keyword: {
                ignore_above: 256,
                type: 'keyword',
              },
            },
            type: 'text',
          },
        },
      },
      some: {
        properties: {
          field: {
            fields: {
              keyword: {
                ignore_above: 256,
                type: 'keyword',
              },
            },
            type: 'text',
          },
        },
      },
      source: {
        properties: {
          ip: {
            fields: {
              keyword: {
                ignore_above: 256,
                type: 'keyword',
              },
            },
            type: 'text',
          },
          port: {
            type: 'long',
          },
        },
      },
    });
  });

  test('it returns null when `indexes` is null', () => {
    expect(
      getMappingsProperties({
        indexes: null, // <--
        indexName: 'auditbeat-custom-index-1',
      })
    ).toBeNull();
  });

  test('it returns null when `indexName` does not exist in `indexes`', () => {
    expect(
      getMappingsProperties({
        indexes: mockIndicesGetMappingIndexMappingRecords,
        indexName: 'does-not-exist', // <--
      })
    ).toBeNull();
  });

  test('it returns null when `properties` does not exist in the mappings', () => {
    const missingProperties = {
      ...mockIndicesGetMappingIndexMappingRecords,
      foozle: {
        mappings: {}, // <-- does not have a `properties`
      },
    };

    expect(
      getMappingsProperties({
        indexes: missingProperties,
        indexName: 'foozle',
      })
    ).toBeNull();
  });
});
