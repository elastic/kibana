/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { first } from 'lodash';

export const ECS_ALLOWED_LIST = [
  'host',
  'cloud',
  'event',
  'agent',
  'fields',
  'service',
  'ecs',
  'metricset',
  'tags',
  'message',
  'labels',
  '@timestamp',
  'source',
  'container',
];

export const K8S_ALLOWED_LIST = [
  'kubernetes.pod.name',
  'kubernetes.pod.uid',
  'kubernetes.namespace',
  'kubernetes.node.name',
  'kubernetes.labels',
  'kubernetes.annotations',
  'kubernetes.replicaset.name',
  'kubernetes.deployment.name',
  'kubernetes.statefulset.name',
  'kubernetes.container.name',
  'kubernetes.container.image',
];

export const PROMETHEUS_ALLOWED_LIST = ['prometheus.labels', 'prometheus.metrics'];

export const DOCKER_ALLOWED_LIST = [
  'docker.container.id',
  'docker.container.image',
  'docker.container.name',
  'docker.container.labels',
];

export const AWS_S3_ALLOWED_LIST = ['aws.s3'];

export const getAllowedListForPrefix = (prefix: string) => {
  const firstPart = first(prefix.split(/\./));
  const defaultAllowedList = prefix ? [...ECS_ALLOWED_LIST, prefix] : ECS_ALLOWED_LIST;
  switch (firstPart) {
    case 'docker':
      return [...defaultAllowedList, ...DOCKER_ALLOWED_LIST];
    case 'prometheus':
      return [...defaultAllowedList, ...PROMETHEUS_ALLOWED_LIST];
    case 'kubernetes':
      return [...defaultAllowedList, ...K8S_ALLOWED_LIST];
    case 'aws':
      if (prefix === 'aws.s3_daily_storage') {
        return [...defaultAllowedList, ...AWS_S3_ALLOWED_LIST];
      }
    default:
      return defaultAllowedList;
  }
};
