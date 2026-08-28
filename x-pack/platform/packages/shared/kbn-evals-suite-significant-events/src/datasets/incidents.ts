/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GCS_BUCKET, INCIDENTS_GCS_BASE_PATH_PREFIX, INCIDENTS_NAMESPACE } from '../constants';
import type { DatasetConfig } from './types';

export const incidentsDataset: DatasetConfig = {
  id: INCIDENTS_NAMESPACE,
  description: 'Real-world incident snapshots captured from customer 0 clusters',
  gcs: { bucket: GCS_BUCKET, basePathPrefix: INCIDENTS_GCS_BASE_PATH_PREFIX, runScoped: false },
  replayMode: 'managed-stream',
  kiFeatureExtraction: [
    {
      input: {
        scenario_id: 'incident-3048',
      },
      output: {
        // Criteria verified against the replayed snapshot (34,097 docs) and the
        // incident RCA: repeated JVM OOMs on the search tier of serverless ES
        // project f7c4f91990c944ddaf6eec9c12bfbe23, caused by large aggregations
        // on 4GB search nodes without autoscaling.
        criteria: [
          {
            id: 'error-signatures',
            text: 'Must reference the incident failure signals — "java.lang.OutOfMemoryError: Java heap space", heap dump creation, "Terminating due to" exit-code-3 restarts, or equivalent memory-exhaustion error descriptions — as evidence on at least one feature (e.g. the Elasticsearch entity or the Java technology feature)',
            score: 2,
            sampling_filters: [
              { match_phrase: { message: 'Java heap space' } },
              { match_phrase: { message: 'Heap dump file created' } },
            ],
          },
          {
            id: 'entity-project',
            text: 'Must identify the serverless Elasticsearch project f7c4f91990c944ddaf6eec9c12bfbe23 as an entity (evidence: 31,318 docs with kubernetes.namespace=project-f7c4f91990c944ddaf6eec9c12bfbe23)',
            score: 2,
            sampling_filters: [
              {
                term: {
                  'kubernetes.namespace.keyword': 'project-f7c4f91990c944ddaf6eec9c12bfbe23',
                },
              },
            ],
          },
          {
            id: 'entity-search-tier',
            text: 'Must identify the Elasticsearch search tier (es-es-search-* pods) as the failing component (evidence: 16,006 docs from es-es-search-* pods; all OOM/heap-dump events occur on those pods)',
            score: 2,
            sampling_filters: [
              { wildcard: { 'kubernetes.pod.name.keyword': { value: 'es-es-search-*' } } },
            ],
          },
          {
            id: 'entity-elasticsearch',
            text: 'Must identify Elasticsearch as an entity (evidence: 30,371 of 34,097 docs in data_stream.dataset=elasticsearch.server)',
            score: 1,
            sampling_filters: [{ term: { 'data_stream.dataset.keyword': 'elasticsearch.server' } }],
          },
          {
            id: 'impact-kibana',
            text: 'Should identify degraded Kibana task processing as downstream impact (evidence: 54 kibana.log docs "Failed to poll for work: Unexpected status code from taskStore::msearch: 503" plus no_shard_available errors)',
            score: 1,
            sampling_filters: [
              {
                bool: {
                  filter: [
                    { term: { 'data_stream.dataset.keyword': 'kibana.log' } },
                    { match_phrase: { message: 'Failed to poll for work' } },
                  ],
                },
              },
            ],
          },
          {
            id: 'dep-kibana-elasticsearch',
            text: 'Should identify the dependency kibana → elasticsearch (evidence: 35 kibana.log docs referencing taskStore::msearch calls against Elasticsearch, incl. 54 "Failed to poll for work" errors when Elasticsearch degraded)',
            score: 1,
            sampling_filters: [
              {
                bool: {
                  filter: [
                    { term: { 'data_stream.dataset.keyword': 'kibana.log' } },
                    { match: { message: 'msearch' } },
                  ],
                },
              },
            ],
          },
          {
            id: 'dep-controller-elasticsearch',
            text: 'Should identify the dependency elasticsearch-controller → elasticsearch (evidence: 433 elasticsearch-controller.log docs on deployment-group reconciliation and 11 docs checking Elasticsearch reachability)',
            score: 1,
            sampling_filters: [
              {
                bool: {
                  filter: [
                    { term: { 'data_stream.dataset.keyword': 'elasticsearch-controller.log' } },
                    { match: { message: 'reconciled' } },
                  ],
                },
              },
              {
                bool: {
                  filter: [
                    { term: { 'data_stream.dataset.keyword': 'elasticsearch-controller.log' } },
                    { match: { message: 'reachable' } },
                  ],
                },
              },
            ],
          },
          {
            id: 'infra-kubernetes',
            text: 'Must identify the Kubernetes-based infrastructure hosting the project — any feature covering the Kubernetes/EKS cluster, AWS cloud, or EC2 hosts counts. Supporting evidence available in the data (host names ip-10-104-*.ec2.internal, arm64 nodes, us-east-1, nodepools) is illustrative; the feature does NOT need to cite all of these details.',
            score: 1,
            sampling_filters: [{ match_phrase: { 'host.name': 'ec2.internal' } }],
          },
        ],
        min_features: 5,
        max_features: 25,
        required_types: ['entity', 'dependency'],
        expect_entity_filters: true,
        expected_ground_truth:
          'entities=[project-f7c4f91990c944ddaf6eec9c12bfbe23, es-search-tier (repeated OOMs), es-index-tier, kibana, elasticsearch-controller], ' +
          'deps=[kibana->elasticsearch (degraded), elasticsearch-controller->elasticsearch], ' +
          'infra=[kubernetes/EKS on AWS EC2, us-east-1, arm64], ' +
          'tech=[elasticsearch-serverless, kibana, fleet, java], ' +
          'error_signatures=[java.lang.OutOfMemoryError: Java heap space, Heap dump file created, Terminating due to exit code 3, ' +
          'Failed to poll for work taskStore::msearch 503]',
      },
      metadata: {
        difficulty: 'hard',
        failure_domain: 'resource-exhaustion',
        failure_mode: 'repeated-ooms',
        incident_id: '3048',
        incident_title: 'project-f7c4f91990c944ddaf6eec9c12bfbe23-repeated-ooms',
      },
      snapshot_source: {
        snapshot_name: 'incident-3048',
        gcs: { basePathPrefix: `${INCIDENTS_GCS_BASE_PATH_PREFIX}/incident-3048` },
      },
    },
  ],
  kiQueryGeneration: [],
  kiFeatureExclusion: [],
  kiFeatureDeduplication: [],
  discovery: [],
};
