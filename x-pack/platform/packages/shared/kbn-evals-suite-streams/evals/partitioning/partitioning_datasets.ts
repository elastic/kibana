/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Condition } from '@kbn/streamlang';

export interface PartitioningGroundTruth {
  expected_partitions: Array<{
    name: string;
    description: string;
    key_fields?: string[];
  }>;
  min_partitions: number;
  max_partitions: number;
  coverage_threshold: number;
  max_overlap_threshold: number;
  expected_reason?: 'no_clusters' | 'no_samples' | 'all_data_partitioned';
}

export interface PartitioningEvaluationExample {
  input: {
    stream_name: string;
    start?: number;
    end?: number;
    user_prompt?: string;
    existing_partitions?: Array<{ name: string; condition: Condition }>;
    refinement_history?: string[];
  };
  output: PartitioningGroundTruth;
  metadata: {
    difficulty: 'easy' | 'medium' | 'hard';
    notes?: string;
  };
}

export interface PartitioningEvaluationDataset {
  name: string;
  description: string;
  examples: PartitioningEvaluationExample[];
}

export const PARTITIONING_DATASETS: PartitioningEvaluationDataset[] = [
  {
    name: 'Multi-System Logs - Partition Suggestion',
    description:
      'Diverse log systems (Hadoop, Proxifier, Android, OpenStack) that should naturally form separate partitions',
    examples: [
      {
        input: {
          stream_name: 'logs.otel.partition-eval',
        },
        output: {
          expected_partitions: [
            {
              name: 'hadoop',
              description: 'Hadoop MapReduce job logs',
              key_fields: ['attributes.filepath'],
            },
            {
              name: 'proxifier',
              description: 'Proxifier proxy software logs',
              key_fields: ['attributes.filepath'],
            },
            {
              name: 'android',
              description: 'Android framework logs',
              key_fields: ['attributes.filepath'],
            },
            {
              name: 'openstack',
              description: 'OpenStack infrastructure logs',
              key_fields: ['attributes.filepath'],
            },
          ],
          min_partitions: 2,
          max_partitions: 6,
          coverage_threshold: 0.9,
          max_overlap_threshold: 0.15,
        },
        metadata: {
          difficulty: 'easy',
          notes:
            'Four distinct LogHub systems with different log formats and schemas. Each system writes to a different filepath, making them easily separable.',
        },
      },
    ],
  },
  {
    name: 'Existing Partition Refinement - Partition Suggestion',
    description:
      'Same diverse data but with an existing partition already defined for Hadoop. The LLM should suggest partitions for the remaining unrouted data.',
    examples: [
      {
        input: {
          stream_name: 'logs.otel.partition-eval',
          existing_partitions: [
            {
              name: 'hadoop',
              condition: { field: 'attributes.filepath', eq: 'Hadoop.log' },
            },
          ],
        },
        output: {
          expected_partitions: [
            {
              name: 'proxifier',
              description: 'Proxifier proxy software logs',
              key_fields: ['attributes.filepath'],
            },
            {
              name: 'android',
              description: 'Android framework logs',
              key_fields: ['attributes.filepath'],
            },
            {
              name: 'openstack',
              description: 'OpenStack infrastructure logs',
              key_fields: ['attributes.filepath'],
            },
          ],
          min_partitions: 1,
          max_partitions: 5,
          coverage_threshold: 0.85,
          max_overlap_threshold: 0.2,
        },
        metadata: {
          difficulty: 'medium',
          notes:
            'Tests that the LLM respects existing partitions and only suggests new ones for unrouted data. Hadoop is already partitioned; remaining systems should be suggested.',
        },
      },
    ],
  },
  {
    name: 'User-Guided Partitioning - Partition Suggestion',
    description:
      'Same diverse data with a user prompt requesting partitioning by a specific field.',
    examples: [
      {
        input: {
          stream_name: 'logs.otel.partition-eval',
          user_prompt: 'Partition by filepath',
        },
        output: {
          expected_partitions: [
            {
              name: 'hadoop',
              description: 'Logs from Hadoop.log',
              key_fields: ['attributes.filepath'],
            },
            {
              name: 'proxifier',
              description: 'Logs from Proxifier.log',
              key_fields: ['attributes.filepath'],
            },
            {
              name: 'android',
              description: 'Logs from Android.log',
              key_fields: ['attributes.filepath'],
            },
            {
              name: 'openstack',
              description: 'Logs from OpenStack.log',
              key_fields: ['attributes.filepath'],
            },
          ],
          min_partitions: 3,
          max_partitions: 6,
          coverage_threshold: 0.9,
          max_overlap_threshold: 0.15,
        },
        metadata: {
          difficulty: 'medium',
          notes:
            'Tests that the LLM follows user guidance to partition by the filepath field, creating one partition per distinct filepath value.',
        },
      },
    ],
  },
  {
    name: 'All Data Partitioned - Partition Suggestion',
    description: 'Edge case where existing partitions already cover all data in the stream.',
    examples: [
      {
        input: {
          stream_name: 'logs.otel.partition-eval',
          existing_partitions: [
            {
              name: 'hadoop',
              condition: { field: 'attributes.filepath', eq: 'Hadoop.log' },
            },
            {
              name: 'proxifier',
              condition: { field: 'attributes.filepath', eq: 'Proxifier.log' },
            },
            {
              name: 'android',
              condition: { field: 'attributes.filepath', eq: 'Android.log' },
            },
            {
              name: 'openstack',
              condition: { field: 'attributes.filepath', eq: 'OpenStack.log' },
            },
          ],
        },
        output: {
          expected_partitions: [],
          min_partitions: 0,
          max_partitions: 0,
          coverage_threshold: 1.0,
          max_overlap_threshold: 0,
          expected_reason: 'all_data_partitioned',
        },
        metadata: {
          difficulty: 'easy',
          notes:
            'All data is already covered by existing partitions. The API should return all_data_partitioned reason with no new partitions.',
        },
      },
    ],
  },
  {
    name: 'Homogeneous Logs - Partition Suggestion',
    description: 'Single system (Linux syslog) where no meaningful partitions should be suggested.',
    examples: [
      {
        input: {
          stream_name: 'logs.otel.partition-homog',
        },
        output: {
          expected_partitions: [],
          min_partitions: 0,
          max_partitions: 1,
          coverage_threshold: 1.0,
          max_overlap_threshold: 0,
        },
        metadata: {
          difficulty: 'easy',
          notes:
            'Homogeneous Linux syslog data. The LLM should either find no clusters or suggest at most one partition covering the whole stream.',
        },
      },
    ],
  },
];
