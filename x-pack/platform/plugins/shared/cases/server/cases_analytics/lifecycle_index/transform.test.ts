/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLifecycleTransformConfig } from './transform';
import {
  getLifecycleTransformId,
  getLifecycleDestinationIndexName,
  CAI_LIFECYCLE_INDEX_VERSION,
} from './constants';
import { getActivityDestinationIndexAlias } from '../activity_index/constants';

describe('getLifecycleTransformConfig', () => {
  const spaceId = 'default';
  const owner = 'securitySolution' as const;

  const config = getLifecycleTransformConfig(spaceId, owner);
  const pivot = config.pivot!;
  const aggs = pivot.aggregations as Record<string, unknown>;

  describe('transform identity and routing', () => {
    it('uses the correct transform id', () => {
      expect(config.transform_id).toBe(getLifecycleTransformId(spaceId, owner));
    });

    it('reads from the activity index alias', () => {
      expect(config.source.index).toEqual([getActivityDestinationIndexAlias(spaceId, owner)]);
    });

    it('writes to the lifecycle destination index', () => {
      expect(config.dest.index).toBe(getLifecycleDestinationIndexName(spaceId, owner));
    });

    it('stores the current version in _meta', () => {
      expect(config._meta).toEqual({ version: CAI_LIFECYCLE_INDEX_VERSION });
    });

    it('pivots on case_id', () => {
      expect(pivot.group_by).toEqual({
        case_id: { terms: { field: 'case_id' } },
      });
    });
  });

  describe('sync configuration', () => {
    it('uses @timestamp as the sync field (indexing time, not created_at)', () => {
      const sync = config.sync as { time: { field: string; delay: string } };
      expect(sync.time.field).toBe('@timestamp');
    });

    it('runs every 5 minutes', () => {
      expect(config.frequency).toBe('5m');
    });

    it('has a 60s sync delay', () => {
      const sync = config.sync as { time: { field: string; delay: string } };
      expect(sync.time.delay).toBe('60s');
    });
  });

  describe('aggregation keys', () => {
    const expectedKeys = [
      'case_created_at',
      'closed_at',
      'first_comment_at',
      'first_assignment_at',
      'latest_activity_at',
      'time_to_close_ms',
      'time_to_first_comment_ms',
      'time_to_first_assignment_ms',
      'total_actions',
      'total_comments',
      'total_status_changes',
      'total_severity_changes',
      'total_reassignments',
      'total_pushes',
      'total_tag_changes',
      'total_category_changes',
      'owner',
      'space_ids',
    ];

    it.each(expectedKeys)('has aggregation: %s', (key) => {
      expect(aggs).toHaveProperty(key);
    });
  });

  describe('countByType aggregations', () => {
    const countFields: Array<[string, string]> = [
      ['total_comments', 'comment'],
      ['total_status_changes', 'status'],
      ['total_severity_changes', 'severity'],
      ['total_reassignments', 'assignees'],
      ['total_pushes', 'pushed'],
      ['total_tag_changes', 'tags'],
      ['total_category_changes', 'category'],
    ];

    it.each(countFields)('%s filters on type == "%s"', (field, typeValue) => {
      const agg = aggs[field] as { scripted_metric: { map_script: string } };
      expect(agg.scripted_metric.map_script).toContain(`doc['type'].value == '${typeValue}'`);
    });
  });

  describe('closed_at — first closure semantics', () => {
    const closedAtAgg = aggs.closed_at as {
      scripted_metric: { map_script: string; reduce_script: string };
    };

    it('map_script uses min comparison (t < state.ts) to track earliest close', () => {
      expect(closedAtAgg.scripted_metric.map_script).toContain('t < state.ts');
    });

    it('map_script does not use max comparison (t > state.ts)', () => {
      expect(closedAtAgg.scripted_metric.map_script).not.toContain('t > state.ts');
    });

    it('reduce_script uses min comparison (v < earliest) to pick earliest across shards', () => {
      expect(closedAtAgg.scripted_metric.reduce_script).toContain('v < earliest');
    });

    it('reduce_script does not use max comparison', () => {
      expect(closedAtAgg.scripted_metric.reduce_script).not.toContain('v > latest');
    });

    it('map_script only triggers on status == closed events', () => {
      expect(closedAtAgg.scripted_metric.map_script).toContain("doc['type'].value == 'status'");
      expect(closedAtAgg.scripted_metric.map_script).toContain(
        "doc['payload.status'].value == 'closed'"
      );
    });
  });

  describe('time_to_close_ms — first closure semantics', () => {
    const ttcAgg = aggs.time_to_close_ms as {
      scripted_metric: { map_script: string; reduce_script: string };
    };

    it('map_script uses min comparison to track earliest close time', () => {
      expect(ttcAgg.scripted_metric.map_script).toContain(
        't < ((Number) state.closed).longValue()'
      );
    });

    it('map_script does not use max comparison for closed time', () => {
      expect(ttcAgg.scripted_metric.map_script).not.toContain(
        't > ((Number) state.closed).longValue()'
      );
    });

    it('reduce_script uses min comparison (cv < closed) across shards', () => {
      expect(ttcAgg.scripted_metric.reduce_script).toContain('cv < closed');
    });

    it('reduce_script does not use max comparison', () => {
      expect(ttcAgg.scripted_metric.reduce_script).not.toContain('cv > closed');
    });

    it('subtracts closed from created to produce duration', () => {
      expect(ttcAgg.scripted_metric.reduce_script).toContain('closed - created');
    });
  });

  describe('first_assignment_at — includes cases created with initial assignees', () => {
    const faaAgg = aggs.first_assignment_at as {
      scripted_metric: { map_script: string };
    };

    it('handles assignees-change events', () => {
      expect(faaAgg.scripted_metric.map_script).toContain("doc['type'].value == 'assignees'");
    });

    it('handles create_case events where initial assignees are present', () => {
      expect(faaAgg.scripted_metric.map_script).toContain("doc['type'].value == 'create_case'");
      expect(faaAgg.scripted_metric.map_script).toContain(
        "doc['payload.assignees.uid'].size() > 0"
      );
    });

    it('uses min comparison to track earliest assignment', () => {
      expect(faaAgg.scripted_metric.map_script).toContain('t < state.ts');
    });
  });

  describe('time_to_first_assignment_ms — includes cases created with initial assignees', () => {
    const ttfaAgg = aggs.time_to_first_assignment_ms as {
      scripted_metric: { map_script: string; reduce_script: string };
    };

    it('handles assignees-change events for firstAssign', () => {
      expect(ttfaAgg.scripted_metric.map_script).toContain("doc['type'].value == 'assignees'");
    });

    it('handles create_case events where initial assignees are present', () => {
      expect(ttfaAgg.scripted_metric.map_script).toContain("doc['type'].value == 'create_case'");
      expect(ttfaAgg.scripted_metric.map_script).toContain(
        "doc['payload.assignees.uid'].size() > 0"
      );
    });

    it('subtracts created from firstAssign to produce duration', () => {
      expect(ttfaAgg.scripted_metric.reduce_script).toContain('first - created');
    });
  });

  describe('time_to_first_comment_ms', () => {
    const ttfcAgg = aggs.time_to_first_comment_ms as {
      scripted_metric: { map_script: string; reduce_script: string };
    };

    it('uses earliest comment event', () => {
      expect(ttfcAgg.scripted_metric.map_script).toContain("doc['type'].value == 'comment'");
      expect(ttfcAgg.scripted_metric.map_script).toContain(
        'state.firstComment == null || t < ((Number) state.firstComment).longValue()'
      );
    });

    it('subtracts created from first comment to produce duration', () => {
      expect(ttfcAgg.scripted_metric.reduce_script).toContain('first - created');
    });
  });
});
