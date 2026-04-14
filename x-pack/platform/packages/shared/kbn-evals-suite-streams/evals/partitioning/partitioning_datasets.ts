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
  expected_reason?: 'no_clusters' | 'no_samples';
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
      'Diverse log systems (Hadoop, Proxifier, Android, OpenStack) with filepath removed. The LLM must analyze log content and field patterns to identify distinct partitions.',
    examples: [
      {
        input: {
          stream_name: 'logs.otel.partition-eval',
        },
        output: {
          expected_partitions: [
            {
              name: 'hadoop',
              description:
                'Hadoop MapReduce job logs with Java stack traces and org.apache.hadoop class names',
              key_fields: ['body.text', 'resource.attributes.process.name'],
            },
            {
              name: 'proxifier',
              description:
                'Proxifier proxy software logs with chrome.exe and proxy connection details',
              key_fields: ['body.text', 'resource.attributes.host.name'],
            },
            {
              name: 'android',
              description:
                'Android framework logs with com.android.* class names and PowerManagerService',
              key_fields: ['body.text', 'resource.attributes.process.name'],
            },
            {
              name: 'openstack',
              description:
                'OpenStack infrastructure logs with nova.* class names and HTTP API requests',
              key_fields: ['body.text', 'resource.attributes.kubernetes.namespace'],
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
            'Four distinct LogHub systems with different log content and schemas. attributes.filepath is removed so the LLM must rely on body.text patterns and field values.',
        },
      },
    ],
  },
  {
    name: 'Existing Partition Refinement - Partition Suggestion',
    description:
      'Same diverse data but with an existing partition already defined. The LLM should suggest partitions for the remaining unrouted data.',
    examples: [
      {
        input: {
          stream_name: 'logs.otel.partition-eval',
          existing_partitions: [
            {
              name: 'hadoop',
              condition: {
                and: [
                  { field: 'body.text', contains: 'hadoop' },
                  { field: 'resource.attributes.process.name', exists: true },
                ],
              },
            },
          ],
        },
        output: {
          expected_partitions: [
            {
              name: 'proxifier',
              description:
                'Proxifier proxy software logs with chrome.exe and proxy connection details',
              key_fields: ['body.text'],
            },
            {
              name: 'android',
              description: 'Android framework logs with com.android.* class names',
              key_fields: ['body.text', 'resource.attributes.process.name'],
            },
            {
              name: 'openstack',
              description: 'OpenStack infrastructure logs with nova.* class names',
              key_fields: ['body.text'],
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
      'Same diverse data with a user prompt requesting partitioning by a specific approach.',
    examples: [
      {
        input: {
          stream_name: 'logs.otel.partition-eval',
          user_prompt: 'Group logs by their source system or service',
        },
        output: {
          expected_partitions: [
            {
              name: 'hadoop',
              description: 'Hadoop MapReduce job logs',
              key_fields: ['body.text'],
            },
            {
              name: 'proxifier',
              description: 'Proxifier proxy software logs',
              key_fields: ['body.text'],
            },
            {
              name: 'android',
              description: 'Android framework logs',
              key_fields: ['body.text'],
            },
            {
              name: 'openstack',
              description: 'OpenStack infrastructure logs',
              key_fields: ['body.text'],
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
            'Tests that the LLM follows user guidance to group logs by source system, using body.text content patterns.',
        },
      },
    ],
  },
  {
    name: 'Overlapping Metadata - Content-Based Partitioning',
    description:
      'Systems with overlapping field schemas (Hadoop+Mac share host/user/process fields; Linux+HPC share process.id) that can only be distinguished by body.text content analysis.',
    examples: [
      {
        input: {
          stream_name: 'logs.otel.partition-hard',
        },
        output: {
          expected_partitions: [
            {
              name: 'hadoop',
              description:
                'Java/MapReduce logs with org.apache.hadoop class names and YARN references',
              key_fields: ['body.text'],
            },
            {
              name: 'mac',
              description:
                'macOS kernel logs with com.apple.* framework names and IOThunderbolt/AirPort references',
              key_fields: ['body.text'],
            },
            {
              name: 'linux',
              description:
                'Linux syslog with sshd/pam_unix authentication messages and rhost IP addresses',
              key_fields: ['body.text'],
            },
            {
              name: 'hpc',
              description:
                'HPC cluster logs with node IDs, unix.hw state_change, and boot/halt commands',
              key_fields: ['body.text'],
            },
          ],
          min_partitions: 2,
          max_partitions: 6,
          coverage_threshold: 0.8,
          max_overlap_threshold: 0.2,
        },
        metadata: {
          difficulty: 'hard',
          notes:
            'Hadoop and Mac share identical metadata schemas (host.name, user.name, process.name, process.pid). ' +
            'Linux and HPC both use process.id instead of process.pid. ' +
            'attributes.filepath is removed. The LLM must analyze body.text content to distinguish systems — ' +
            'Hadoop has Java/MapReduce patterns, Mac has macOS kernel/IO patterns, Linux has syslog auth patterns, HPC has cluster node patterns.',
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
