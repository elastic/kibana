/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AllocateAction, Phases } from '@kbn/index-lifecycle-management-common-shared';
import {
  buildPhaseContent,
  customAllocationSection,
  downsampleSection,
  forcemergeSection,
  getAllocationLabel,
  replicasSection,
  shrinkSection,
  snapshotSection,
} from './phase_content';
import { inspectIlmPolicyFlyoutStrings as strings } from './strings';

const getRowValue = (
  sections: Array<{ rows: Array<{ label: string; value: unknown }> }>,
  label: string
) => {
  for (const section of sections) {
    const row = section.rows.find((r) => r.label === label);
    if (row) return row.value;
  }
  throw new Error(`Row not found: ${label}`);
};

describe('phase_content', () => {
  describe('replicasSection', () => {
    it('includes only defined replica-related fields', () => {
      const allocate: AllocateAction = { number_of_replicas: 1 };
      const section = replicasSection(allocate);

      expect(section.section).toBe(strings.replicasSection);
      expect(section.rows).toEqual([{ label: strings.numberOfReplicas, value: 1 }]);
    });
  });

  describe('customAllocationSection', () => {
    it('returns null when include/exclude/require are missing or empty', () => {
      expect(customAllocationSection({})).toBeNull();
      expect(customAllocationSection({ include: {}, exclude: {}, require: {} })).toBeNull();
    });

    it('formats node attributes and returns a section when any attribute set is present', () => {
      const section = customAllocationSection({
        include: { data: 'warm' },
        exclude: { rack: 'r1' },
        require: { zone: 'eu-west-1' },
      });

      expect(section?.section).toBe(strings.nodeAttributesSection);
      expect(section?.rows).toEqual([
        { label: strings.allocateInclude, value: 'data: warm' },
        { label: strings.allocateExclude, value: 'rack: r1' },
        { label: strings.allocateRequire, value: 'zone: eu-west-1' },
      ]);
    });
  });

  describe('getAllocationLabel', () => {
    it('returns warm label by default and when migrate.enabled is not false', () => {
      expect(getAllocationLabel(undefined, 'warm')).toBe(strings.useWarmNodes);
      expect(getAllocationLabel({ enabled: true }, 'warm')).toBe(strings.useWarmNodes);
    });

    it('returns no-data-tier-migration label when migrate.enabled is false', () => {
      expect(getAllocationLabel({ enabled: false }, 'warm')).toBe(strings.noDataTierMigration);
    });

    it('returns cold label by default and when migrate.enabled is not false', () => {
      expect(getAllocationLabel(undefined, 'cold')).toBe(strings.useColdNodes);
      expect(getAllocationLabel({ enabled: true }, 'cold')).toBe(strings.useColdNodes);
    });

    it('returns no-data-tier-migration label for cold phase when migrate.enabled is false', () => {
      expect(getAllocationLabel({ enabled: false }, 'cold')).toBe(strings.noDataTierMigration);
    });
  });

  describe('shrinkSection', () => {
    it('includes the configured primary shard size when shrinking by size', () => {
      const section = shrinkSection({ max_primary_shard_size: '50gb' });

      expect(section.rows).toEqual([
        { label: strings.shrinkBy, value: strings.shrinkBySize },
        { label: strings.primaryShardSize, value: '50gb' },
      ]);
    });
  });

  describe('forcemergeSection', () => {
    it('omits compress stored field row when index_codec is absent', () => {
      const section = forcemergeSection({ max_num_segments: 1 });

      expect(section.rows).toEqual([{ label: strings.numberOfSegments, value: 1 }]);
    });

    it('includes compress stored field row when index_codec is best_compression', () => {
      const section = forcemergeSection({
        max_num_segments: 1,
        index_codec: 'best_compression',
      });

      expect(section.rows).toEqual([
        { label: strings.numberOfSegments, value: 1 },
        { label: strings.compressStoredField, value: strings.enabledLabel },
      ]);
    });
  });

  describe('downsampleSection', () => {
    it('returns a section with the fixed_interval as a row', () => {
      const section = downsampleSection({ fixed_interval: '1h' });

      expect(section.section).toBe(strings.downsampleSection);
      expect(section.rows).toEqual([{ label: strings.downsampleFixedInterval, value: '1h' }]);
    });
  });

  describe('snapshotSection', () => {
    it('includes the snapshot repository row', () => {
      const section = snapshotSection({
        snapshot_repository: 'repo-1',
      });

      expect(section.section).toBe(strings.searchableSnapshotSection);
      expect(section.rows).toEqual([{ label: strings.repository, value: 'repo-1' }]);
    });
  });

  describe('buildPhaseContent', () => {
    it('builds warm phase content with custom node attributes and explicit disabled migration', () => {
      const phases: Phases = {
        warm: {
          min_age: '7d',
          actions: {
            readonly: {},
            allocate: {
              number_of_replicas: 1,
              include: { data: 'warm' },
            },
            migrate: { enabled: false },
          },
        },
      };

      const sections = buildPhaseContent('warm', phases);

      expect(sections.map((s) => s.section)).toEqual([
        undefined,
        strings.replicasSection,
        strings.nodeAttributesSection,
        strings.dataAllocationSection,
      ]);

      expect(getRowValue(sections, strings.readOnly)).toBe(strings.enabledLabel);
      expect(getRowValue(sections, strings.numberOfReplicas)).toBe(1);
      expect(getRowValue(sections, strings.allocateInclude)).toBe('data: warm');
      expect(getRowValue(sections, strings.moveData)).toBe(strings.noDataTierMigration);
    });

    it('builds warm phase content with custom node attributes and explicit tier migration', () => {
      const phases: Phases = {
        warm: {
          min_age: '7d',
          actions: {
            allocate: {
              include: { data: 'warm' },
            },
            migrate: { enabled: true },
          },
        },
      };

      const sections = buildPhaseContent('warm', phases);

      expect(sections.map((s) => s.section)).toEqual([
        strings.nodeAttributesSection,
        strings.dataAllocationSection,
      ]);
      expect(getRowValue(sections, strings.allocateInclude)).toBe('data: warm');
      expect(getRowValue(sections, strings.moveData)).toBe(strings.useWarmNodes);
    });

    it('shows default tier allocation for warm phase with no actions', () => {
      const phases: Phases = {
        warm: {
          min_age: '7d',
          actions: {},
        },
      };

      const sections = buildPhaseContent('warm', phases);

      expect(sections).toEqual([
        {
          section: strings.dataAllocationSection,
          rows: [{ label: strings.moveData, value: strings.useWarmNodes }],
        },
      ]);
    });

    it('builds delete phase content and defaults delete_searchable_snapshot to enabled', () => {
      const phases: Phases = {
        delete: {
          min_age: '90d',
          actions: {
            delete: {},
            wait_for_snapshot: { policy: 'external-snapshots' },
          },
        },
      };

      const sections = buildPhaseContent('delete', phases);

      expect(getRowValue(sections, strings.deleteSnapshot)).toBe(strings.enabledLabel);
      expect(sections[1]).toEqual({
        section: strings.waitForPolicySnapshotSection,
        rows: [{ label: strings.policyName, value: 'external-snapshots' }],
      });
    });

    it('includes read-only row for hot phase', () => {
      const phases: Phases = {
        hot: { actions: { readonly: {} } },
      };

      const sections = buildPhaseContent('hot', phases);
      const row = sections.flatMap((s) => s.rows).find((r) => r.label === strings.readOnly);
      expect(row?.value).toBe(strings.enabledLabel);
    });

    it('displays rollover maximum thresholds under trigger rollover and minimum thresholds under restrict rollover', () => {
      const phases: Phases = {
        hot: {
          actions: {
            rollover: {
              max_age: '30d',
              max_primary_shard_size: '50gb',
              max_size: '100gb',
              min_docs: 1000,
              min_primary_shard_docs: 500,
            },
          },
        },
      };

      const sections = buildPhaseContent('hot', phases);

      expect(sections).toEqual([
        {
          section: strings.rolloverTriggerSection,
          rows: [
            { label: strings.rolloverAge, value: '≥ 30d' },
            { label: strings.rolloverPrimaryShardSize, value: '≥ 50GB' },
            { label: strings.rolloverIndexSize, value: '≥ 100GB' },
          ],
        },
        {
          section: strings.rolloverRestrictSection,
          rows: [
            { label: strings.rolloverDocs, value: '≥ 1000' },
            { label: strings.rolloverPrimaryShardDocs, value: '≥ 500' },
          ],
        },
      ]);
    });

    it('renders read-only as the first row for cold phase', () => {
      const phases: Phases = {
        cold: { actions: { readonly: {}, freeze: {} } },
      };

      const sections = buildPhaseContent('cold', phases);
      expect(sections[0].rows[0]).toEqual({
        label: strings.readOnly,
        value: strings.enabledLabel,
      });
    });

    it('builds cold phase content with custom node attributes instead of default tier allocation', () => {
      const phases: Phases = {
        cold: {
          min_age: '30d',
          actions: {
            allocate: {
              require: { data: 'cold' },
            },
          },
        },
      };

      const sections = buildPhaseContent('cold', phases);

      expect(sections.map((s) => s.section)).toEqual([strings.nodeAttributesSection]);
      expect(getRowValue(sections, strings.allocateRequire)).toBe('data: cold');
      expect(sections.find((s) => s.section === strings.dataAllocationSection)).toBeUndefined();
    });

    it.each<'hot' | 'warm' | 'cold'>(['hot', 'warm', 'cold'])(
      'includes downsample section for %s phase',
      (phase) => {
        const phases: Phases = {
          [phase]: {
            min_age: '0ms',
            actions: {
              downsample: { fixed_interval: '1d' },
            },
          },
        };

        const sections = buildPhaseContent(phase, phases);
        const ds = sections.find((s) => s.section === strings.downsampleSection);

        expect(ds).toBeDefined();
        expect(ds?.rows).toEqual([{ label: strings.downsampleFixedInterval, value: '1d' }]);
      }
    );

    it('builds delete phase content and respects delete_searchable_snapshot=false', () => {
      const phases: Phases = {
        delete: {
          min_age: '90d',
          actions: {
            delete: { delete_searchable_snapshot: false },
          },
        },
      };

      const sections = buildPhaseContent('delete', phases);
      expect(getRowValue(sections, strings.deleteSnapshot)).toBe(strings.disabledLabel);
    });
  });
});
