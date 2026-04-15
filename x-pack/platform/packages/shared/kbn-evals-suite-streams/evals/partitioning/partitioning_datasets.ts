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
                'Hadoop MapReduce job logs with service.name=hadoop-yarn and host.name=yarn-node-1',
              key_fields: ['service.name', 'body.text'],
            },
            {
              name: 'proxifier',
              description:
                'Proxifier proxy software logs with service.name=proxifier-proxy and host.name=proxy-1',
              key_fields: ['service.name', 'body.text'],
            },
            {
              name: 'android',
              description:
                'Android framework logs with service.name=android-system and os.platform=android',
              key_fields: ['service.name', 'os.platform'],
            },
            {
              name: 'openstack',
              description:
                'OpenStack infrastructure logs with service.name=openstack-nova and cloud.provider=openstack',
              key_fields: ['service.name', 'cloud.provider'],
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
            'Four distinct LogHub systems with correlated metadata fields (service.name, host.name, os.platform, cloud.provider). The LLM can partition by service.name as the primary key or by body.text patterns.',
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
                'Hadoop with service.name=data-platform, data_layer=batch. Java/MapReduce patterns in body.text.',
              key_fields: ['service.name', 'data_layer', 'body.text'],
            },
            {
              name: 'mac',
              description:
                'Mac with service.name=data-platform, data_layer=streaming. macOS kernel/IO patterns in body.text.',
              key_fields: ['service.name', 'data_layer', 'body.text'],
            },
            {
              name: 'linux',
              description:
                'Linux with service.name=infra-monitoring, host.name=mon-1. syslog auth patterns in body.text.',
              key_fields: ['service.name', 'host.name', 'body.text'],
            },
            {
              name: 'hpc',
              description:
                'HPC with service.name=infra-monitoring, host.name=mon-2, cluster.node_id=node-001. Cluster patterns in body.text.',
              key_fields: ['service.name', 'cluster.node_id', 'body.text'],
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
            'Hadoop and Mac both have service.name=data-platform; Linux and HPC both have service.name=infra-monitoring. ' +
            'The LLM must use secondary fields (data_layer for Hadoop/Mac; host.name/cluster.node_id for Linux/HPC) ' +
            'combined with body.text pattern analysis to distinguish systems correctly.',
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
