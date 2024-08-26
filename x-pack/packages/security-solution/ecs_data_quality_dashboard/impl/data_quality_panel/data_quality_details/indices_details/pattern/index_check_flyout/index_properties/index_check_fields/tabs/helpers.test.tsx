/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash/fp';

import {
  eventCategory,
  timestamp,
} from '../../../../../../../mock/enriched_field_metadata/mock_enriched_field_metadata';
import { mockPartitionedFieldMetadata } from '../../../../../../../mock/partitioned_field_metadata/mock_partitioned_field_metadata';
import { mockStatsAuditbeatIndex } from '../../../../../../../mock/stats/mock_stats_packetbeat_index';
import {
  getEcsCompliantBadgeColor,
  getMissingTimestampComment,
  getTabs,
  showMissingTimestampCallout,
} from './helpers';

describe('helpers', () => {
  describe('getMissingTimestampComment', () => {
    test('it returns the expected comment', () => {
      expect(getMissingTimestampComment()).toEqual(
        '#### Missing an @timestamp (date) field mapping for this index\n\nConsider adding an @timestamp (date) field mapping to this index, as required by the Elastic Common Schema (ECS), because:\n\n❌ Detection engine rules referencing these fields may not match them correctly\n❌ Pages may not display some events or fields due to unexpected field mappings or values\n'
      );
    });
  });

  describe('showMissingTimestampCallout', () => {
    test('it returns true when `enrichedFieldMetadata` is empty', () => {
      expect(showMissingTimestampCallout([])).toBe(true);
    });

    test('it returns false when `enrichedFieldMetadata` contains an @timestamp field', () => {
      expect(showMissingTimestampCallout([timestamp, eventCategory])).toBe(false);
    });

    test('it returns true when `enrichedFieldMetadata` does NOT contain an @timestamp field', () => {
      expect(showMissingTimestampCallout([eventCategory])).toBe(true);
    });
  });

  describe('getEcsCompliantBadgeColor', () => {
    test('it returns the expected color for the ECS compliant data when the data includes an @timestamp', () => {
      expect(getEcsCompliantBadgeColor(mockPartitionedFieldMetadata)).toBe('hollow');
    });

    test('it returns the expected color for the ECS compliant data does NOT includes an @timestamp', () => {
      const noTimestamp = {
        ...mockPartitionedFieldMetadata,
        ecsCompliant: mockPartitionedFieldMetadata.ecsCompliant.filter(
          ({ name }) => name !== '@timestamp'
        ),
      };

      expect(getEcsCompliantBadgeColor(noTimestamp)).toEqual('danger');
    });
  });

  describe('getTabs', () => {
    test('it returns the expected tabs', () => {
      expect(
        getTabs({
          docsCount: 4,
          formatBytes: jest.fn(),
          formatNumber: jest.fn(),
          ilmPhase: 'unmanaged',
          indexName: 'auditbeat-custom-index-1',
          partitionedFieldMetadata: mockPartitionedFieldMetadata,
          patternDocsCount: 57410,
          stats: mockStatsAuditbeatIndex,
        }).map((x) => omit(['append', 'content'], x))
      ).toEqual([
        {
          id: 'incompatibleTab',
          name: 'Incompatible fields',
        },
        {
          id: 'sameFamilyTab',
          name: 'Same family',
        },
        {
          id: 'customTab',
          name: 'Custom fields',
        },
        {
          id: 'ecsCompliantTab',
          name: 'ECS compliant fields',
        },
        {
          id: 'allTab',
          name: 'All fields',
        },
      ]);
    });
  });
});
