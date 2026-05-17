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
    name: 'Multi-System',
    description:
      'Diverse log systems (Hadoop, Proxifier, Android, OpenStack). The LLM must identify distinct partitions.',
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
                'Hadoop MapReduce job logs with Java stack traces, org.apache.hadoop class names, and YARN references',
              key_fields: ['service.name'],
            },
            {
              name: 'proxifier',
              description:
                'Proxifier proxy software logs with service.name=proxifier-proxy, host.name=proxy-1, and proxy connection details',
              key_fields: ['service.name'],
            },
            {
              name: 'android',
              description:
                'Android framework logs with service.name=android-system, os.platform=android, and com.android.* class names',
              key_fields: ['service.name', 'os.platform'],
            },
            {
              name: 'openstack',
              description:
                'OpenStack infrastructure logs with service.name=openstack-nova, cloud.provider=openstack, and nova.* class names',
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
            'Four distinct LogHub systems with correlated metadata fields (service.name, os.platform, cloud.provider). The LLM should use these structured fields to distinguish systems.',
        },
      },
    ],
  },
  {
    name: 'Refinement',
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
              key_fields: ['service.name'],
            },
            {
              name: 'android',
              description: 'Android framework logs with com.android.* class names',
              key_fields: ['service.name'],
            },
            {
              name: 'openstack',
              description: 'OpenStack infrastructure logs with nova.* class names',
              key_fields: ['service.name'],
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
    name: 'User-Guided',
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
              key_fields: ['service.name'],
            },
            {
              name: 'proxifier',
              description: 'Proxifier proxy software logs',
              key_fields: ['service.name'],
            },
            {
              name: 'android',
              description: 'Android framework logs',
              key_fields: ['service.name'],
            },
            {
              name: 'openstack',
              description: 'OpenStack infrastructure logs',
              key_fields: ['service.name'],
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
            'Tests that the LLM follows user guidance to group logs by source system, using structured metadata fields.',
        },
      },
      {
        input: {
          stream_name: 'logs.otel.partition-eval',
          user_prompt: 'Partition logs by their service.name field',
        },
        output: {
          expected_partitions: [
            {
              name: 'hadoop',
              description: 'Data platform batch logs with service.name=data-platform',
              key_fields: ['service.name'],
            },
            {
              name: 'proxifier',
              description: 'Proxifier proxy logs with service.name=proxifier-proxy',
              key_fields: ['service.name'],
            },
            {
              name: 'android',
              description: 'Android system logs with service.name=android-system',
              key_fields: ['service.name'],
            },
            {
              name: 'openstack',
              description: 'OpenStack Nova logs with service.name=openstack-nova',
              key_fields: ['service.name'],
            },
          ],
          min_partitions: 3,
          max_partitions: 5,
          coverage_threshold: 0.9,
          max_overlap_threshold: 0.15,
        },
        metadata: {
          difficulty: 'easy',
          notes:
            'Direct field-based guidance. The LLM should use service.name to create four clean partitions.',
        },
      },
      {
        input: {
          stream_name: 'logs.otel.partition-eval',
          user_prompt: 'Create two partitions: cloud infrastructure and on-premise systems',
        },
        output: {
          expected_partitions: [
            {
              name: 'cloud-infrastructure',
              description: 'OpenStack cloud infrastructure logs with cloud.provider=openstack',
              key_fields: ['cloud.provider', 'service.name'],
            },
            {
              name: 'on-premise',
              description: 'Hadoop, Proxifier, and Android on-premise logs',
              key_fields: ['service.name'],
            },
          ],
          min_partitions: 2,
          max_partitions: 3,
          coverage_threshold: 0.9,
          max_overlap_threshold: 0.15,
        },
        metadata: {
          difficulty: 'medium',
          notes:
            'Tests conceptual grouping guidance. OpenStack is cloud infrastructure; Hadoop, Proxifier, and Android are on-premise. The LLM must infer the grouping from metadata fields.',
        },
      },
    ],
  },
  {
    name: 'Overlapping Metadata',
    description:
      'Hard data with overlapping metadata where user guidance should help the LLM disambiguate systems.',
    examples: [
      {
        input: {
          stream_name: 'logs.otel.partition-hard',
          user_prompt: 'Split logs into data platform services and infrastructure monitoring',
        },
        output: {
          expected_partitions: [
            {
              name: 'data-platform',
              description: 'Hadoop and Mac data platform logs with service.name=data-platform',
              key_fields: ['service.name'],
            },
            {
              name: 'infra-monitoring',
              description:
                'Linux and HPC infrastructure monitoring logs with service.name=infra-monitoring',
              key_fields: ['service.name'],
            },
          ],
          min_partitions: 2,
          max_partitions: 3,
          coverage_threshold: 0.85,
          max_overlap_threshold: 0.15,
        },
        metadata: {
          difficulty: 'medium',
          notes:
            'Tests high-level conceptual grouping across overlapping metadata. Hadoop+Mac share service.name=data-platform; Linux+HPC share service.name=infra-monitoring.',
        },
      },
      {
        input: {
          stream_name: 'logs.otel.partition-hard',
          user_prompt:
            'Group logs by processing layer: batch processing, streaming, and infrastructure monitoring',
        },
        output: {
          expected_partitions: [
            {
              name: 'batch',
              description: 'Hadoop batch processing logs with data_layer=batch',
              key_fields: ['data_layer'],
            },
            {
              name: 'streaming',
              description: 'Mac streaming logs with data_layer=streaming',
              key_fields: ['data_layer'],
            },
            {
              name: 'monitoring',
              description: 'Linux and HPC infrastructure monitoring logs',
              key_fields: ['service.name'],
            },
          ],
          min_partitions: 2,
          max_partitions: 4,
          coverage_threshold: 0.85,
          max_overlap_threshold: 0.2,
        },
        metadata: {
          difficulty: 'medium',
          notes:
            'Tests multi-category conceptual guidance. Hadoop=batch, Mac=streaming, Linux+HPC=monitoring. The LLM must map guidance to different fields (data_layer vs service.name).',
        },
      },
    ],
  },
  {
    name: 'User-Guided Refinement',
    description:
      'Existing partitions with additional user guidance for the remaining unrouted data.',
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
          user_prompt: 'Partition the remaining logs by service name',
        },
        output: {
          expected_partitions: [
            {
              name: 'proxifier',
              description: 'Proxifier proxy logs with service.name=proxifier-proxy',
              key_fields: ['service.name'],
            },
            {
              name: 'android',
              description: 'Android system logs with service.name=android-system',
              key_fields: ['service.name'],
            },
            {
              name: 'openstack',
              description: 'OpenStack Nova logs with service.name=openstack-nova',
              key_fields: ['service.name'],
            },
          ],
          min_partitions: 2,
          max_partitions: 5,
          coverage_threshold: 0.85,
          max_overlap_threshold: 0.2,
        },
        metadata: {
          difficulty: 'medium',
          notes:
            'Tests combining existing partitions with user guidance. Hadoop is already partitioned; the LLM should use service.name to partition the remaining three systems.',
        },
      },
    ],
  },
  {
    name: 'Content-Based',
    description:
      'Systems with overlapping field schemas (Hadoop+Mac share service.name; Linux+HPC share service.name) that require secondary fields to distinguish.',
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
                'Hadoop with service.name=data-platform, data_layer=batch. Java/MapReduce patterns.',
              key_fields: ['service.name', 'data_layer'],
            },
            {
              name: 'mac',
              description:
                'Mac with service.name=data-platform, data_layer=streaming. macOS kernel/IO patterns.',
              key_fields: ['service.name', 'data_layer'],
            },
            {
              name: 'linux',
              description:
                'Linux with service.name=infra-monitoring, host.name=mon-1. syslog auth patterns.',
              key_fields: ['service.name', 'host.name'],
            },
            {
              name: 'hpc',
              description:
                'HPC with service.name=infra-monitoring, host.name=mon-2, cluster.node_id=node-001. Cluster patterns.',
              key_fields: ['service.name', 'cluster.node_id'],
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
            'to distinguish systems correctly.',
        },
      },
    ],
  },
  {
    name: 'Homogeneous',
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
