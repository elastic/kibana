/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DARK_THEME } from '@elastic/charts';
import { euiThemeVars } from '@kbn/ui-theme';
import { omit } from 'lodash/fp';

import {
  eventCategory,
  timestamp,
} from '../../mock/enriched_field_metadata/mock_enriched_field_metadata';
import { mockPartitionedFieldMetadata } from '../../mock/partitioned_field_metadata/mock_partitioned_field_metadata';
import { mockStatsAuditbeatIndex } from '../../mock/stats/mock_stats_packetbeat_index';
import {
  getEcsCompliantColor,
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

  describe('getEcsCompliantColor', () => {
    test('it returns the expected color for the ECS compliant data when the data includes an @timestamp', () => {
      expect(getEcsCompliantColor(mockPartitionedFieldMetadata)).toEqual(
        euiThemeVars.euiColorSuccess
      );
    });

    test('it returns the expected color for the ECS compliant data does NOT includes an @timestamp', () => {
      const noTimestamp = {
        ...mockPartitionedFieldMetadata,
        ecsCompliant: mockPartitionedFieldMetadata.ecsCompliant.filter(
          ({ name }) => name !== '@timestamp'
        ),
      };

      expect(getEcsCompliantColor(noTimestamp)).toEqual(euiThemeVars.euiColorDanger);
    });
  });

  describe('getTabs', () => {
    test('it returns the expected tabs', () => {
      expect(
        getTabs({
          addSuccessToast: jest.fn(),
          addToNewCaseDisabled: false,
          docsCount: 4,
          formatBytes: jest.fn(),
          formatNumber: jest.fn(),
          getGroupByFieldsOnClick: jest.fn(),
          ilmPhase: 'unmanaged',
          indexName: 'auditbeat-custom-index-1',
          isAssistantEnabled: true,
          onAddToNewCase: jest.fn(),
          partitionedFieldMetadata: mockPartitionedFieldMetadata,
          pattern: 'auditbeat-*',
          patternDocsCount: 57410,
          setSelectedTabId: jest.fn(),
          stats: mockStatsAuditbeatIndex,
          baseTheme: DARK_THEME,
        }).map((x) => omit(['append', 'content'], x))
      ).toEqual([
        {
          id: 'summaryTab',
          name: 'Summary',
        },
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
