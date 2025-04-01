/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MAX_SELECTABLE_GROUP_BY_TERMS = 4;
export const MAX_SELECTABLE_SOURCE_FIELDS = 5;
export const MAX_HITS_FOR_GROUP_BY = 100;

const HOST_NAME = 'host.name';
const HOST_HOSTNAME = 'host.hostname';
const HOST_ID = 'host.id';
const CONTAINER_ID = 'container.id';
const KUBERNETES_POD_UID = 'kubernetes.pod.uid';

export const validSourceFields = [
  HOST_NAME,
  HOST_HOSTNAME,
  HOST_ID,
  CONTAINER_ID,
  KUBERNETES_POD_UID,
];

export const ES_QUERY_MAX_HITS_PER_EXECUTION = 10000;
export const ES_QUERY_MAX_HITS_PER_EXECUTION_SERVERLESS = 100;
