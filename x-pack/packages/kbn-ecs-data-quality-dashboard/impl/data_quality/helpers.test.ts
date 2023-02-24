/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IlmExplainLifecycleLifecycleExplain,
  MappingProperty,
} from '@elastic/elasticsearch/lib/api/types';
import { EcsFlat } from '@kbn/ecs';
import { omit } from 'lodash/fp';

import {
  FieldType,
  getDocsCount,
  getErrorSummary,
  getErrorSummaries,
  getErrorSummariesForRollup,
  getEnrichedFieldMetadata,
  getFieldTypes,
  getPatternIlmPhaseDescription,
  getIlmPhaseDescription,
  getIncompatibleStatColor,
  getIndexNames,
  getIsInSameFamily,
  getMissingTimestampFieldMetadata,
  getPartitionedFieldMetadata,
  getPartitionedFieldMetadataStats,
  getTotalDocsCount,
  getTotalPatternIncompatible,
  getTotalPatternIndicesChecked,
  hasValidTimestampMapping,
  isMappingCompatible,
} from './helpers';
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
} from './mock/enriched_field_metadata';
import { mockIlmExplain } from './mock/ilm_explain';
import { alertIndexNoResults } from './mock/pattern_rollup/mock_alerts_pattern_rollup';
import {
  packetbeatNoResults,
  packetbeatWithSomeErrors,
} from './mock/pattern_rollup/mock_packetbeat_pattern_rollup';
import {
  auditbeatNoResults,
  auditbeatWithAllResults,
} from './mock/pattern_rollup/mock_auditbeat_pattern_rollup';
import { mockStats } from './mock/stats/mock_stats';
import { mockStatsGreenIndex } from './mock/stats/mock_stats_green_index';
import { mockStatsYellowIndex } from './mock/stats/mock_stats_yellow_index';
import {
  COLD_DESCRIPTION,
  FROZEN_DESCRIPTION,
  HOT_DESCRIPTION,
  TIMESTAMP_DESCRIPTION,
  UNMANAGED_DESCRIPTION,
  WARM_DESCRIPTION,
} from './translations';
import {
  DataQualityCheckResult,
  EcsMetadata,
  EnrichedFieldMetadata,
  PartitionedFieldMetadata,
  PatternRollup,
  UnallowedValueCount,
} from './types';

const ecsMetadata: Record<string, EcsMetadata> = EcsFlat as unknown as Record<string, EcsMetadata>;

describe('helpers', () => {
  describe('getIndexNames', () => {
    const ilmPhases: string[] = ['hot', 'warm', 'unmanaged'];

    test('returns the expected index names when they have an ILM phase included in the ilmPhases list', () => {
      expect(
        getIndexNames({
          ilmExplain: mockIlmExplain, // <-- the mock indexes have 'hot' ILM phases
          ilmPhases,
          stats: mockStats,
        })
      ).toEqual([
        '.ds-packetbeat-8.6.1-2023.02.04-000001',
        '.ds-packetbeat-8.5.3-2023.02.04-000001',
      ]);
    });

    test('returns the expected filtered index names when they do NOT have an ILM phase included in the ilmPhases list', () => {
      expect(
        getIndexNames({
          ilmExplain: mockIlmExplain, // <-- the mock indexes have 'hot' ILM phases...
          ilmPhases: ['warm', 'unmanaged'], // <-- ...but we don't ask for 'hot'
          stats: mockStats,
        })
      ).toEqual([]);
    });

    test('returns the expected index names when the `ilmExplain` is missing a record for an index', () => {
      // the following `ilmExplain` is missing a record for one of the two packetbeat indexes:
      const ilmExplainWithMissingIndex: Record<string, IlmExplainLifecycleLifecycleExplain> = omit(
        '.ds-packetbeat-8.6.1-2023.02.04-000001',
        mockIlmExplain
      );

      expect(
        getIndexNames({
          ilmExplain: ilmExplainWithMissingIndex, // <-- the mock indexes have 'hot' ILM phases...
          ilmPhases: ['hot', 'warm', 'unmanaged'],
          stats: mockStats,
        })
      ).toEqual(['.ds-packetbeat-8.5.3-2023.02.04-000001']); // <-- only includes one of the two indexes, because the other one is missing an ILM explain record
    });

    test('returns empty index names when `ilmPhases` is empty', () => {
      expect(
        getIndexNames({
          ilmExplain: mockIlmExplain,
          ilmPhases: [],
          stats: mockStats,
        })
      ).toEqual([]);
    });

    test('returns empty index names when they have an ILM phase that matches', () => {
      expect(
        getIndexNames({
          ilmExplain: null,
          ilmPhases,
          stats: mockStats,
        })
      ).toEqual([]);
    });

    test('returns empty index names when just `stats` is null', () => {
      expect(
        getIndexNames({
          ilmExplain: mockIlmExplain,
          ilmPhases,
          stats: null,
        })
      ).toEqual([]);
    });

    test('returns empty index names when both `ilmExplain` and `stats` are null', () => {
      expect(
        getIndexNames({
          ilmExplain: null,
          ilmPhases,
          stats: null,
        })
      ).toEqual([]);
    });
  });

  describe('getFieldTypes', () => {
    /**
     * These `mappingsProperties` represent mappings that were generated by
     * Elasticsearch automatically, for an index named `auditbeat-custom-index-1`:
     *
     * ```
     * DELETE auditbeat-custom-index-1
     *
     * PUT auditbeat-custom-index-1
     *
     * PUT auditbeat-custom-index-1/_mapping
     * {
     *   "properties": {
     *     "@timestamp": {
     *       "type": "date"
     *     },
     *     "event.category": {
     *       "type": "keyword",
     *       "ignore_above": 1024
     *     }
     *   }
     * }
     * ```
     *
     * when the following document was inserted:
     *
     * ```
     * POST auditbeat-custom-index-1/_doc
     * {
     *   "@timestamp": "2023-02-06T09:41:49.668Z",
     *   "host": {
     *     "name": "foo"
     *   },
     *   "event": {
     *     "category": "an_invalid_category"
     *   },
     *   "some.field": "this",
     *   "source": {
     *     "port": 90210,
     *     "ip": "10.1.2.3"
     *   }
     * }
     * ```
     */
    const mappingsProperties: Record<string, MappingProperty> = {
      '@timestamp': {
        type: 'date',
      },
      event: {
        properties: {
          category: {
            type: 'keyword',
            ignore_above: 1024,
          },
        },
      },
      host: {
        properties: {
          name: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
                ignore_above: 256,
              },
            },
          },
        },
      },
      some: {
        properties: {
          field: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
                ignore_above: 256,
              },
            },
          },
        },
      },
      source: {
        properties: {
          ip: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
                ignore_above: 256,
              },
            },
          },
          port: {
            type: 'long',
          },
        },
      },
    };

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
      expect(getFieldTypes(mappingsProperties)).toEqual(expected);
    });

    test('it throws a type error when mappingsProperties is not flatten-able', () => {
      // @ts-expect-error
      const invalidType: Record<string, unknown> = []; // <-- this is an array, NOT a valid Record<string, unknown>

      expect(() => getFieldTypes(invalidType)).toThrowError('Root value is not flatten-able');
    });
  });

  describe('getIsInSameFamily', () => {
    test('it returns false when ecsExpectedType is undefined', () => {
      expect(getIsInSameFamily({ ecsExpectedType: undefined, type: 'keyword' })).toBe(false);
    });

    const expectedFamilyMembers: {
      [key: string]: string[];
    } = {
      constant_keyword: ['keyword', 'wildcard'], // `keyword` and `wildcard` in the same family as `constant_keyword`
      keyword: ['constant_keyword', 'wildcard'],
      match_only_text: ['text'],
      text: ['match_only_text'],
      wildcard: ['keyword', 'constant_keyword'],
    };

    const ecsExpectedTypes = Object.keys(expectedFamilyMembers);

    ecsExpectedTypes.forEach((ecsExpectedType) => {
      const otherMembersOfSameFamily = expectedFamilyMembers[ecsExpectedType];

      otherMembersOfSameFamily.forEach((type) =>
        test(`it returns true for ecsExpectedType '${ecsExpectedType}' when given '${type}', a type in the same family`, () => {
          expect(getIsInSameFamily({ ecsExpectedType, type })).toBe(true);
        })
      );

      test(`it returns false for ecsExpectedType '${ecsExpectedType}' when given 'date', a type NOT in the same family`, () => {
        expect(getIsInSameFamily({ ecsExpectedType, type: 'date' })).toBe(false);
      });
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
    const happyPathResult: EnrichedFieldMetadata = {
      allowed_values: [
        {
          description:
            'Events in this category are related to the challenge and response process in which credentials are supplied and verified to allow the creation of a session. Common sources for these logs are Windows event logs and ssh logs. Visualize and analyze events in this category to look for failed logins, and other authentication-related activity.',
          expected_event_types: ['start', 'end', 'info'],
          name: 'authentication',
        },
        {
          description:
            'Events in the configuration category have to deal with creating, modifying, or deleting the settings or parameters of an application, process, or system.\nExample sources include security policy change logs, configuration auditing logging, and system integrity monitoring.',
          expected_event_types: ['access', 'change', 'creation', 'deletion', 'info'],
          name: 'configuration',
        },
        {
          description:
            'The database category denotes events and metrics relating to a data storage and retrieval system. Note that use of this category is not limited to relational database systems. Examples include event logs from MS SQL, MySQL, Elasticsearch, MongoDB, etc. Use this category to visualize and analyze database activity such as accesses and changes.',
          expected_event_types: ['access', 'change', 'info', 'error'],
          name: 'database',
        },
        {
          description:
            'Events in the driver category have to do with operating system device drivers and similar software entities such as Windows drivers, kernel extensions, kernel modules, etc.\nUse events and metrics in this category to visualize and analyze driver-related activity and status on hosts.',
          expected_event_types: ['change', 'end', 'info', 'start'],
          name: 'driver',
        },
        {
          description:
            'This category is used for events relating to email messages, email attachments, and email network or protocol activity.\nEmails events can be produced by email security gateways, mail transfer agents, email cloud service providers, or mail server monitoring applications.',
          expected_event_types: ['info'],
          name: 'email',
        },
        {
          description:
            'Relating to a set of information that has been created on, or has existed on a filesystem. Use this category of events to visualize and analyze the creation, access, and deletions of files. Events in this category can come from both host-based and network-based sources. An example source of a network-based detection of a file transfer would be the Zeek file.log.',
          expected_event_types: ['change', 'creation', 'deletion', 'info'],
          name: 'file',
        },
        {
          description:
            'Use this category to visualize and analyze information such as host inventory or host lifecycle events.\nMost of the events in this category can usually be observed from the outside, such as from a hypervisor or a control plane\'s point of view. Some can also be seen from within, such as "start" or "end".\nNote that this category is for information about hosts themselves; it is not meant to capture activity "happening on a host".',
          expected_event_types: ['access', 'change', 'end', 'info', 'start'],
          name: 'host',
        },
        {
          description:
            'Identity and access management (IAM) events relating to users, groups, and administration. Use this category to visualize and analyze IAM-related logs and data from active directory, LDAP, Okta, Duo, and other IAM systems.',
          expected_event_types: [
            'admin',
            'change',
            'creation',
            'deletion',
            'group',
            'info',
            'user',
          ],
          name: 'iam',
        },
        {
          description:
            'Relating to intrusion detections from IDS/IPS systems and functions, both network and host-based. Use this category to visualize and analyze intrusion detection alerts from systems such as Snort, Suricata, and Palo Alto threat detections.',
          expected_event_types: ['allowed', 'denied', 'info'],
          name: 'intrusion_detection',
        },
        {
          description:
            'Malware detection events and alerts. Use this category to visualize and analyze malware detections from EDR/EPP systems such as Elastic Endpoint Security, Symantec Endpoint Protection, Crowdstrike, and network IDS/IPS systems such as Suricata, or other sources of malware-related events such as Palo Alto Networks threat logs and Wildfire logs.',
          expected_event_types: ['info'],
          name: 'malware',
        },
        {
          description:
            'Relating to all network activity, including network connection lifecycle, network traffic, and essentially any event that includes an IP address. Many events containing decoded network protocol transactions fit into this category. Use events in this category to visualize or analyze counts of network ports, protocols, addresses, geolocation information, etc.',
          expected_event_types: [
            'access',
            'allowed',
            'connection',
            'denied',
            'end',
            'info',
            'protocol',
            'start',
          ],
          name: 'network',
        },
        {
          description:
            'Relating to software packages installed on hosts. Use this category to visualize and analyze inventory of software installed on various hosts, or to determine host vulnerability in the absence of vulnerability scan data.',
          expected_event_types: ['access', 'change', 'deletion', 'info', 'installation', 'start'],
          name: 'package',
        },
        {
          description:
            'Use this category of events to visualize and analyze process-specific information such as lifecycle events or process ancestry.',
          expected_event_types: ['access', 'change', 'end', 'info', 'start'],
          name: 'process',
        },
        {
          description:
            'Having to do with settings and assets stored in the Windows registry. Use this category to visualize and analyze activity such as registry access and modifications.',
          expected_event_types: ['access', 'change', 'creation', 'deletion'],
          name: 'registry',
        },
        {
          description:
            'The session category is applied to events and metrics regarding logical persistent connections to hosts and services. Use this category to visualize and analyze interactive or automated persistent connections between assets. Data for this category may come from Windows Event logs, SSH logs, or stateless sessions such as HTTP cookie-based sessions, etc.',
          expected_event_types: ['start', 'end', 'info'],
          name: 'session',
        },
        {
          description:
            "Use this category to visualize and analyze events describing threat actors' targets, motives, or behaviors.",
          expected_event_types: ['indicator'],
          name: 'threat',
        },
        {
          description:
            'Relating to vulnerability scan results. Use this category to analyze vulnerabilities detected by Tenable, Qualys, internal scanners, and other vulnerability management sources.',
          expected_event_types: ['info'],
          name: 'vulnerability',
        },
        {
          description:
            'Relating to web server access. Use this category to create a dashboard of web server/proxy activity from apache, IIS, nginx web servers, etc. Note: events from network observers such as Zeek http log may also be included in this category.',
          expected_event_types: ['access', 'error', 'info'],
          name: 'web',
        },
      ],
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
      isInSameFamily: true, // `keyword` and `keyword` are in the same family
    };

    test('it returns the happy path result when the index has no mapping conflicts, and no unallowed values', () => {
      expect(
        getEnrichedFieldMetadata({
          ecsMetadata,
          fieldMetadata: fieldMetadataCorrectMappingType, // no mapping conflicts for `event.category` in this index
          unallowedValues: noUnallowedValues, // no unallowed values for `event.category` in this index
        })
      ).toEqual({ ...happyPathResult });
    });

    test('it returns the happy path result when the index has no mapping conflicts, and the unallowedValues map does not contain an entry for the field', () => {
      // create an `unallowedValues` that doesn't have an entry for `event.category`:
      const noEntryForEventCategory: Record<string, UnallowedValueCount[]> = omit(
        'event.category',
        unallowedValues
      );

      expect(
        getEnrichedFieldMetadata({
          ecsMetadata,
          fieldMetadata: fieldMetadataCorrectMappingType, // no mapping conflicts for `event.category` in this index
          unallowedValues: noEntryForEventCategory, // a lookup in this map for the `event.category` field will return undefined
        })
      ).toEqual({ ...happyPathResult });
    });

    test('it returns a result with the expected `indexInvalidValues` and `isEcsCompliant` when the index has no mapping conflict, but it has unallowed values', () => {
      expect(
        getEnrichedFieldMetadata({
          ecsMetadata,
          fieldMetadata: fieldMetadataCorrectMappingType, // no mapping conflicts for `event.category` in this index
          unallowedValues, // this index has unallowed values for the event.category field
        })
      ).toEqual({
        ...happyPathResult,
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
      });
    });

    test('it returns a result with the expected `isEcsCompliant` and `isInSameFamily` when the index type does not match ECS, but NO unallowed values', () => {
      const indexFieldType = 'text';

      expect(
        getEnrichedFieldMetadata({
          ecsMetadata,
          fieldMetadata: {
            field: 'event.category', // `event.category` is a `keyword`, per the ECS spec
            type: indexFieldType, // this index has a mapping of `text` instead
          },
          unallowedValues: noUnallowedValues, // no unallowed values for `event.category` in this index
        })
      ).toEqual({
        ...happyPathResult,
        indexFieldType,
        isEcsCompliant: false, // `keyword` !== `text`
        isInSameFamily: false, // `keyword` and `text` are not in the same family
      });
    });

    test('it returns a result with the expected `isEcsCompliant` and `isInSameFamily` when the mapping is is in the same family', () => {
      const indexFieldType = 'wildcard';

      expect(
        getEnrichedFieldMetadata({
          ecsMetadata,
          fieldMetadata: {
            field: 'event.category', // `event.category` is a `keyword` per the ECS spec
            type: indexFieldType, // this index has a mapping of `wildcard` instead
          },
          unallowedValues: noUnallowedValues, // no unallowed values for `event.category` in this index
        })
      ).toEqual({
        ...happyPathResult,
        indexFieldType,
        isEcsCompliant: false, // `wildcard` !== `keyword`
        isInSameFamily: true, // `wildcard` and `keyword` are in the same family
      });
    });

    test('it returns a result with the expected `indexInvalidValues`,`isEcsCompliant`, and `isInSameFamily` when the index has BOTH mapping conflicts, and unallowed values', () => {
      const indexFieldType = 'text';

      expect(
        getEnrichedFieldMetadata({
          ecsMetadata,
          fieldMetadata: {
            field: 'event.category', // `event.category` is a `keyword` per the ECS spec
            type: indexFieldType, // this index has a mapping of `text` instead
          },
          unallowedValues, // this index also has unallowed values for the event.category field
        })
      ).toEqual({
        ...happyPathResult,
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
      });
    });

    test('it returns the expected result for a custom field, i.e. a field that does NOT have an entry in `ecsMetadata`', () => {
      const field = 'a_custom_field'; // not defined by ECS
      const indexFieldType = 'keyword';

      expect(
        getEnrichedFieldMetadata({
          ecsMetadata,
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
        description: TIMESTAMP_DESCRIPTION,
        hasEcsMetadata: true,
        indexFieldName: '@timestamp',
        indexFieldType: '-', // the index did NOT define a mapping for @timestamp
        indexInvalidValues: [],
        isEcsCompliant: false, // an index must define the @timestamp mapping
        isInSameFamily: false, // `date` is not a member of any families
        type: 'date',
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
      };

      expect(getPartitionedFieldMetadata(enrichedFieldMetadata)).toEqual(expected);
    });
  });

  describe('getPartitionedFieldMetadataStats', () => {
    test('it returns the expected stats', () => {
      const partitionedFieldMetadata: PartitionedFieldMetadata = {
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
      };

      expect(getPartitionedFieldMetadataStats(partitionedFieldMetadata)).toEqual({
        all: 9,
        custom: 4,
        ecsCompliant: 2,
        incompatible: 3,
      });
    });
  });

  describe('hasValidTimestampMapping', () => {
    test('it returns true when the `enrichedFieldMetadata` has a valid @timestamp', () => {
      const enrichedFieldMetadata: EnrichedFieldMetadata[] = [timestamp, sourcePort];

      expect(hasValidTimestampMapping(enrichedFieldMetadata)).toBe(true);
    });

    test('it returns false when the `enrichedFieldMetadata` collection does NOT include a valid @timestamp', () => {
      const enrichedFieldMetadata: EnrichedFieldMetadata[] = [sourcePort];

      expect(hasValidTimestampMapping(enrichedFieldMetadata)).toBe(false);
    });

    test('it returns false when the `enrichedFieldMetadata` has an @timestamp with an invalid mapping', () => {
      const timestampWithInvalidMapping: EnrichedFieldMetadata = {
        ...timestamp,
        indexFieldType: 'text', // invalid mapping, should be "date"
      };
      const enrichedFieldMetadata: EnrichedFieldMetadata[] = [
        timestampWithInvalidMapping,
        sourcePort,
      ];

      expect(hasValidTimestampMapping(enrichedFieldMetadata)).toBe(false);
    });

    test('it returns false when `enrichedFieldMetadata` is empty', () => {
      expect(hasValidTimestampMapping([])).toBe(false);
    });
  });

  describe('getDocsCount', () => {
    test('it returns the expected docs count when `stats` contains the `indexName`', () => {
      const indexName = '.ds-packetbeat-8.6.1-2023.02.04-000001';
      const expectedCount = mockStatsYellowIndex[indexName].primaries?.docs?.count;

      expect(
        getDocsCount({
          indexName,
          stats: mockStatsYellowIndex,
        })
      ).toEqual(expectedCount);
    });

    test('it returns zero when `stats` does NOT contain the `indexName`', () => {
      const indexName = 'not-gonna-find-it';

      expect(
        getDocsCount({
          indexName,
          stats: mockStatsYellowIndex,
        })
      ).toEqual(0);
    });

    test('it returns zero when `stats` is null', () => {
      const indexName = '.ds-packetbeat-8.6.1-2023.02.04-000001';

      expect(
        getDocsCount({
          indexName,
          stats: null,
        })
      ).toEqual(0);
    });

    test('it returns the expected total for a green index, where `primaries.docs.count` and `total.docs.count` have different values', () => {
      const indexName = 'auditbeat-custom-index-1';

      expect(
        getDocsCount({
          indexName,
          stats: mockStatsGreenIndex,
        })
      ).toEqual(mockStatsGreenIndex[indexName].primaries?.docs?.count);
    });
  });

  describe('getTotalDocsCount', () => {
    test('it returns the expected total given a subset of index names in the stats', () => {
      const indexName = '.ds-packetbeat-8.5.3-2023.02.04-000001';
      const expectedCount = mockStatsYellowIndex[indexName].primaries?.docs?.count;

      expect(
        getTotalDocsCount({
          indexNames: [indexName],
          stats: mockStatsYellowIndex,
        })
      ).toEqual(expectedCount);
    });

    test('it returns the expected total given all index names in the stats', () => {
      const allIndexNamesInStats = [
        '.ds-packetbeat-8.6.1-2023.02.04-000001',
        '.ds-packetbeat-8.5.3-2023.02.04-000001',
      ];

      expect(
        getTotalDocsCount({
          indexNames: allIndexNamesInStats,
          stats: mockStatsYellowIndex,
        })
      ).toEqual(3258632);
    });

    test('it returns zero given an empty collection of index names', () => {
      expect(
        getTotalDocsCount({
          indexNames: [], // <-- empty
          stats: mockStatsYellowIndex,
        })
      ).toEqual(0);
    });

    test('it returns the expected total for a green index', () => {
      const indexName = 'auditbeat-custom-index-1';
      const expectedCount = mockStatsGreenIndex[indexName].primaries?.docs?.count;

      expect(
        getTotalDocsCount({
          indexNames: [indexName],
          stats: mockStatsGreenIndex,
        })
      ).toEqual(expectedCount);
    });
  });

  describe('getIlmPhaseDescription', () => {
    const phases: Array<{
      phase: string;
      expected: string;
    }> = [
      {
        phase: 'hot',
        expected: HOT_DESCRIPTION,
      },
      {
        phase: 'warm',
        expected: WARM_DESCRIPTION,
      },
      {
        phase: 'cold',
        expected: COLD_DESCRIPTION,
      },
      {
        phase: 'frozen',
        expected: FROZEN_DESCRIPTION,
      },
      {
        phase: 'unmanaged',
        expected: UNMANAGED_DESCRIPTION,
      },
      {
        phase: 'something-else',
        expected: ' ',
      },
    ];

    phases.forEach(({ phase, expected }) => {
      test(`it returns ${expected} when phase is ${phase}`, () => {
        expect(getIlmPhaseDescription(phase)).toBe(expected);
      });
    });
  });

  describe('getPatternIlmPhaseDescription', () => {
    const phases: Array<{
      expected: string;
      indices: number;
      pattern: string;
      phase: string;
    }> = [
      {
        expected:
          '1 index matching the .alerts-security.alerts-default pattern is hot. Hot indices are actively being updated and queried.',
        indices: 1,
        pattern: '.alerts-security.alerts-default',
        phase: 'hot',
      },
      {
        expected:
          '2 indices matching the .alerts-security.alerts-default pattern are hot. Hot indices are actively being updated and queried.',
        indices: 2,
        pattern: '.alerts-security.alerts-default',
        phase: 'hot',
      },
      {
        expected:
          '1 index matching the .alerts-security.alerts-default pattern is warm. Warm indices are no longer being updated but are still being queried.',
        indices: 1,
        pattern: '.alerts-security.alerts-default',
        phase: 'warm',
      },
      {
        expected:
          '2 indices matching the .alerts-security.alerts-default pattern are warm. Warm indices are no longer being updated but are still being queried.',
        indices: 2,
        pattern: '.alerts-security.alerts-default',
        phase: 'warm',
      },
      {
        expected:
          '1 index matching the .alerts-security.alerts-default pattern is cold. Cold indices are no longer being updated and are queried infrequently. The information still needs to be searchable, but it’s okay if those queries are slower.',
        indices: 1,
        pattern: '.alerts-security.alerts-default',
        phase: 'cold',
      },
      {
        expected:
          '2 indices matching the .alerts-security.alerts-default pattern are cold. Cold indices are no longer being updated and are queried infrequently. The information still needs to be searchable, but it’s okay if those queries are slower.',
        indices: 2,
        pattern: '.alerts-security.alerts-default',
        phase: 'cold',
      },
      {
        expected:
          "1 index matching the .alerts-security.alerts-default pattern is frozen. Frozen indices are no longer being updated and are queried rarely. The information still needs to be searchable, but it's okay if those queries are extremely slow.",
        indices: 1,
        pattern: '.alerts-security.alerts-default',
        phase: 'frozen',
      },
      {
        expected:
          "2 indices matching the .alerts-security.alerts-default pattern are frozen. Frozen indices are no longer being updated and are queried rarely. The information still needs to be searchable, but it's okay if those queries are extremely slow.",
        indices: 2,
        pattern: '.alerts-security.alerts-default',
        phase: 'frozen',
      },
      {
        expected:
          '1 index matching the .alerts-security.alerts-default pattern is unmanaged by Index Lifecycle Management (ILM)',
        indices: 1,
        pattern: '.alerts-security.alerts-default',
        phase: 'unmanaged',
      },
      {
        expected:
          '2 indices matching the .alerts-security.alerts-default pattern are unmanaged by Index Lifecycle Management (ILM)',
        indices: 2,
        pattern: '.alerts-security.alerts-default',
        phase: 'unmanaged',
      },
      {
        expected: '',
        indices: 1,
        pattern: '.alerts-security.alerts-default',
        phase: 'some-other-phase',
      },
      {
        expected: '',
        indices: 2,
        pattern: '.alerts-security.alerts-default',
        phase: 'some-other-phase',
      },
    ];

    phases.forEach(({ expected, indices, pattern, phase }) => {
      test(`it returns the expected description when indices is ${indices}, pattern is ${pattern}, and phase is ${phase}`, () => {
        expect(getPatternIlmPhaseDescription({ indices, pattern, phase })).toBe(expected);
      });
    });
  });

  describe('getTotalPatternIncompatible', () => {
    test('it returns zero when multiple indices in the results results have a count of zero', () => {
      const results: Record<string, DataQualityCheckResult> = {
        '.ds-packetbeat-8.5.3-2023.02.04-000001': {
          docsCount: 1630289,
          error: null,
          ilmPhase: 'hot',
          incompatible: 0,
          indexName: '.ds-packetbeat-8.5.3-2023.02.04-000001',
          markdownComments: ['foo', 'bar', 'baz'],
          pattern: 'packetbeat-*',
        },
        '.ds-packetbeat-8.6.1-2023.02.04-000001': {
          docsCount: 1628343,
          error: null,
          ilmPhase: 'hot',
          incompatible: 0,
          indexName: '.ds-packetbeat-8.6.1-2023.02.04-000001',
          markdownComments: ['foo', 'bar', 'baz'],
          pattern: 'packetbeat-*',
        },
      };

      expect(getTotalPatternIncompatible(results)).toEqual(0);
    });

    test("it returns the expected total when some indices have incompatible fields, but others don't", () => {
      const results: Record<string, DataQualityCheckResult> = {
        '.ds-auditbeat-8.6.1-2023.02.07-000001': {
          docsCount: 18086,
          error: null,
          ilmPhase: 'hot',
          incompatible: 0,
          indexName: '.ds-auditbeat-8.6.1-2023.02.07-000001',
          markdownComments: ['foo', 'bar', 'baz'],
          pattern: 'auditbeat-*',
        },
        'auditbeat-custom-index-1': {
          docsCount: 4,
          error: null,
          ilmPhase: 'unmanaged',
          incompatible: 3,
          indexName: 'auditbeat-custom-index-1',
          markdownComments: ['foo', 'bar', 'baz'],
          pattern: 'auditbeat-*',
        },
        'auditbeat-custom-empty-index-1': {
          docsCount: 0,
          error: null,
          ilmPhase: 'unmanaged',
          incompatible: 1,
          indexName: 'auditbeat-custom-empty-index-1',
          markdownComments: ['foo', 'bar', 'baz'],
          pattern: 'auditbeat-*',
        },
      };

      expect(getTotalPatternIncompatible(results)).toEqual(4);
    });

    test('it returns the expected total when some indices have undefined incompatible counts', () => {
      const results: Record<string, DataQualityCheckResult> = {
        '.ds-auditbeat-8.6.1-2023.02.07-000001': {
          docsCount: 18086,
          error: null,
          ilmPhase: 'hot',
          incompatible: undefined, // <-- this index has an undefined `incompatible`
          indexName: '.ds-auditbeat-8.6.1-2023.02.07-000001',
          markdownComments: ['foo', 'bar', 'baz'],
          pattern: 'auditbeat-*',
        },
        'auditbeat-custom-index-1': {
          docsCount: 4,
          error: null,
          ilmPhase: 'unmanaged',
          incompatible: 3,
          indexName: 'auditbeat-custom-index-1',
          markdownComments: ['foo', 'bar', 'baz'],
          pattern: 'auditbeat-*',
        },
        'auditbeat-custom-empty-index-1': {
          docsCount: 0,
          error: null,
          ilmPhase: 'unmanaged',
          incompatible: 1,
          indexName: 'auditbeat-custom-empty-index-1',
          markdownComments: ['foo', 'bar', 'baz'],
          pattern: 'auditbeat-*',
        },
      };

      expect(getTotalPatternIncompatible(results)).toEqual(4);
    });

    test('it returns zero when `results` is empty', () => {
      expect(getTotalPatternIncompatible({})).toEqual(0);
    });

    test('it returns undefined when `results` is undefined', () => {
      expect(getTotalPatternIncompatible(undefined)).toBeUndefined();
    });
  });

  describe('getTotalPatternIndicesChecked', () => {
    test('it returns zero when `patternRollup` is undefined', () => {
      expect(getTotalPatternIndicesChecked(undefined)).toEqual(0);
    });

    test('it returns zero when `patternRollup` does NOT have any results', () => {
      expect(getTotalPatternIndicesChecked(auditbeatNoResults)).toEqual(0);
    });

    test('it returns the expected total when all indices in `patternRollup` have results', () => {
      expect(getTotalPatternIndicesChecked(auditbeatWithAllResults)).toEqual(3);
    });

    test('it returns the expected total when some indices in `patternRollup` have errors', () => {
      expect(getTotalPatternIndicesChecked(packetbeatWithSomeErrors)).toEqual(1);
    });
  });

  describe('getIncompatibleStatColor', () => {
    test('it returns the expected color when incompatible is greater than zero', () => {
      const incompatible = 123;

      expect(getIncompatibleStatColor(incompatible)).toBe('#bd271e');
    });

    test('it returns undefined when incompatible is zero', () => {
      const incompatible = 0;

      expect(getIncompatibleStatColor(incompatible)).toBeUndefined();
    });

    test('it returns undefined when incompatible is undefined', () => {
      const incompatible = undefined;

      expect(getIncompatibleStatColor(incompatible)).toBeUndefined();
    });
  });

  describe('getErrorSummary', () => {
    test('it returns the expected error summary', () => {
      const resultWithError: DataQualityCheckResult = {
        docsCount: 1630289,
        error:
          'Error loading mappings for .ds-packetbeat-8.5.3-2023.02.04-000001: Error: simulated error fetching index .ds-packetbeat-8.5.3-2023.02.04-000001',
        ilmPhase: 'hot',
        incompatible: undefined,
        indexName: '.ds-packetbeat-8.5.3-2023.02.04-000001',
        markdownComments: ['foo', 'bar', 'baz'],
        pattern: 'packetbeat-*',
      };

      expect(getErrorSummary(resultWithError)).toEqual({
        error:
          'Error loading mappings for .ds-packetbeat-8.5.3-2023.02.04-000001: Error: simulated error fetching index .ds-packetbeat-8.5.3-2023.02.04-000001',
        indexName: '.ds-packetbeat-8.5.3-2023.02.04-000001',
        pattern: 'packetbeat-*',
      });
    });
  });

  describe('getErrorSummariesForRollup', () => {
    test('it returns the expected array of `ErrorSummary` when the `PatternRollup` contains errors', () => {
      expect(getErrorSummariesForRollup(packetbeatWithSomeErrors)).toEqual([
        {
          error:
            'Error loading mappings for .ds-packetbeat-8.5.3-2023.02.04-000001: Error: simulated error fetching index .ds-packetbeat-8.5.3-2023.02.04-000001',
          indexName: '.ds-packetbeat-8.5.3-2023.02.04-000001',
          pattern: 'packetbeat-*',
        },
      ]);
    });

    test('it returns the an empty array of `ErrorSummary` when the `PatternRollup` contains all results, with NO errors', () => {
      expect(getErrorSummariesForRollup(auditbeatWithAllResults)).toEqual([]);
    });

    test('it returns the an empty array of `ErrorSummary` when the `PatternRollup` has NO results', () => {
      expect(getErrorSummariesForRollup(auditbeatNoResults)).toEqual([]);
    });

    test('it returns the an empty array of `ErrorSummary` when the `PatternRollup` is undefined', () => {
      expect(getErrorSummariesForRollup(undefined)).toEqual([]);
    });

    test('it returns BOTH the expected (root) pattern-level error, and an index-level error when `PatternRollup` has both', () => {
      const withPatternLevelError: PatternRollup = {
        ...packetbeatWithSomeErrors,
        error: 'This is a pattern-level error',
      };

      expect(getErrorSummariesForRollup(withPatternLevelError)).toEqual([
        {
          error: 'This is a pattern-level error',
          indexName: null,
          pattern: 'packetbeat-*',
        },
        {
          error:
            'Error loading mappings for .ds-packetbeat-8.5.3-2023.02.04-000001: Error: simulated error fetching index .ds-packetbeat-8.5.3-2023.02.04-000001',
          indexName: '.ds-packetbeat-8.5.3-2023.02.04-000001',
          pattern: 'packetbeat-*',
        },
      ]);
    });

    test('it returns the expected (root) pattern-level error when there are no index-level results', () => {
      const withPatternLevelError: PatternRollup = {
        ...auditbeatNoResults,
        error: 'This is a pattern-level error',
      };

      expect(getErrorSummariesForRollup(withPatternLevelError)).toEqual([
        {
          error: 'This is a pattern-level error',
          indexName: null,
          pattern: 'auditbeat-*',
        },
      ]);
    });
  });

  describe('getErrorSummaries', () => {
    test('it returns an empty array when patternRollups is empty', () => {
      expect(getErrorSummaries({})).toEqual([]);
    });

    test('it returns an empty array when none of the patternRollups have errors', () => {
      expect(
        getErrorSummaries({
          '.alerts-security.alerts-default': alertIndexNoResults,
          'auditbeat-*': auditbeatWithAllResults,
          'packetbeat-*': packetbeatNoResults,
        })
      ).toEqual([]);
    });

    test('it returns the expected array of `ErrorSummary` when some of the `PatternRollup` contain errors', () => {
      expect(
        getErrorSummaries({
          '.alerts-security.alerts-default': alertIndexNoResults,
          'auditbeat-*': auditbeatWithAllResults,
          'packetbeat-*': packetbeatWithSomeErrors, // <-- has errors
        })
      ).toEqual([
        {
          error:
            'Error loading mappings for .ds-packetbeat-8.5.3-2023.02.04-000001: Error: simulated error fetching index .ds-packetbeat-8.5.3-2023.02.04-000001',
          indexName: '.ds-packetbeat-8.5.3-2023.02.04-000001',
          pattern: 'packetbeat-*',
        },
      ]);
    });

    test('it returns the expected array of `ErrorSummary` when there are both pattern-level and index-level errors', () => {
      const withPatternLevelError: PatternRollup = {
        ...auditbeatNoResults,
        error: 'This is a pattern-level error',
      };

      expect(
        getErrorSummaries({
          '.alerts-security.alerts-default': alertIndexNoResults,
          'auditbeat-*': withPatternLevelError, // <-- has pattern-level errors
          'packetbeat-*': packetbeatWithSomeErrors, // <-- has index-level errors
        })
      ).toEqual([
        {
          error: 'This is a pattern-level error',
          indexName: null,
          pattern: 'auditbeat-*',
        },
        {
          error:
            'Error loading mappings for .ds-packetbeat-8.5.3-2023.02.04-000001: Error: simulated error fetching index .ds-packetbeat-8.5.3-2023.02.04-000001',
          indexName: '.ds-packetbeat-8.5.3-2023.02.04-000001',
          pattern: 'packetbeat-*',
        },
      ]);
    });

    test('it returns the expected array of `ErrorSummary` when there are just pattern-level errors', () => {
      const withPatternLevelError: PatternRollup = {
        ...auditbeatNoResults,
        error: 'This is a pattern-level error',
      };

      expect(
        getErrorSummaries({
          '.alerts-security.alerts-default': alertIndexNoResults,
          'auditbeat-*': withPatternLevelError, // <-- has pattern-level errors
          'packetbeat-*': packetbeatNoResults,
        })
      ).toEqual([
        {
          error: 'This is a pattern-level error',
          indexName: null,
          pattern: 'auditbeat-*',
        },
      ]);
    });
  });
});
