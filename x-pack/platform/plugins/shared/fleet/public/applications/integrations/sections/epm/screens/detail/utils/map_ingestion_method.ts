/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegistryPolicyTemplate } from '../../../../../types';

function mapInputType(inputType: string): string | undefined {
  const typeMap: Record<string, string> = {
    // API mappings - Log/Event collection APIs
    cel: 'API',
    'entity-analytics': 'API',
    httpjson: 'API',
    o365audit: 'API',
    salesforce: 'API',
    streaming: 'API',
    websocket: 'API',
    winlog: 'API',

    // API mappings - Metrics collection APIs
    'apache/metrics': 'API',
    'aws/metrics': 'API',
    'awsfargate/metrics': 'API',
    'containerd/metrics': 'API',
    'docker/metrics': 'API',
    'elasticsearch/metrics': 'API',
    'enterprisesearch/metrics': 'API',
    'etcd/metrics': 'API',
    'gcp/metrics': 'API',
    'haproxy/metrics': 'API',
    'http/metrics': 'API',
    'kibana/metrics': 'API',
    'kubernetes/metrics': 'API',
    'logstash/metrics': 'API',
    'meraki/metrics': 'API',
    'nats/metrics': 'API',
    'nginx/metrics': 'API',
    'panw/metrics': 'API',
    'rabbitmq/metrics': 'API',
    'stan/metrics': 'API',
    'vsphere/metrics': 'API',
    'windows/metrics': 'API',

    // Database mappings
    'memcached/metrics': 'Database',
    'mongodb/metrics': 'Database',
    'mysql/metrics': 'Database',
    'postgresql/metrics': 'Database',
    redis: 'Database',
    'redis/metrics': 'Database',
    'sql/metrics': 'Database',
    'zookeeper/metrics': 'Database',

    // Jolokia mappings
    'activemq/metrics': 'Jolokia',
    'jolokia/metrics': 'Jolokia',
    'kafka/metrics': 'Jolokia',

    // File mappings
    filestream: 'File',
    logfile: 'File',
    'linux/metrics': 'File',
    'system/metrics': 'File',

    // Network mappings
    syslog: 'Network Protocol',
    tcp: 'Network Protocol',
    udp: 'Network Protocol',
    'statsd/metrics': 'Network Protocol',

    // Webhook mappings
    http_endpoint: 'Webhook',

    // Unmapped cases
    'aws-s3': 'AWS S3',
    'azure-blob-storage': 'Azure Blob Storage',
    'aws-cloudwatch': 'AWS CloudWatch',
    'azure-eventhub': 'Azure Event Hub',
    etw: 'ETW',
    'gcp-pubsub': 'GCP Pub/Sub',
    gcs: 'Google Cloud Storage',
    'iis/metrics': 'Windows Performance Counters',
    journald: 'journald',
    kafka: 'kafka',
    lumberjack: 'Lumberjack',
    netflow: 'NetFlow',
    'prometheus/metrics': 'Prometheus',
  };

  return typeMap[inputType];
}

export function mapInputsToIngestionMethods(
  policyTemplates: RegistryPolicyTemplate[] | undefined
): Set<string> {
  if (!policyTemplates) {
    return new Set<string>();
  }

  const mappedTypes = policyTemplates
    .flatMap((template) => ('inputs' in template && template.inputs) || [])
    .map((input) => mapInputType(input.type))
    .filter((type): type is string => type !== undefined);

  return new Set(mappedTypes);
}
