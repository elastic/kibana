/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@kbn/core-analytics-browser';
import {
  CLOUD_CONNECT_CLUSTER_CONNECTED,
  CLOUD_CONNECT_CLUSTER_DISCONNECTED,
  CLOUD_CONNECT_SERVICE_ENABLED,
  CLOUD_CONNECT_SERVICE_DISABLED,
  CLOUD_CONNECT_LINK_CLICKED,
} from './constants';
import {
  clusterConnectedSchema,
  clusterDisconnectedSchema,
  serviceToggledSchema,
  linkClickedSchema,
} from './schemas';
import type {
  ClusterConnectedProps,
  ClusterDisconnectedProps,
  ServiceToggledProps,
  LinkClickedProps,
} from './types';

export const clusterConnectedEventType: EventTypeOpts<ClusterConnectedProps> = {
  eventType: CLOUD_CONNECT_CLUSTER_CONNECTED,
  schema: clusterConnectedSchema,
};

export const clusterDisconnectedEventType: EventTypeOpts<ClusterDisconnectedProps> = {
  eventType: CLOUD_CONNECT_CLUSTER_DISCONNECTED,
  schema: clusterDisconnectedSchema,
};

export const serviceEnabledEventType: EventTypeOpts<ServiceToggledProps> = {
  eventType: CLOUD_CONNECT_SERVICE_ENABLED,
  schema: serviceToggledSchema,
};

export const serviceDisabledEventType: EventTypeOpts<ServiceToggledProps> = {
  eventType: CLOUD_CONNECT_SERVICE_DISABLED,
  schema: serviceToggledSchema,
};

export const linkClickedEventType: EventTypeOpts<LinkClickedProps> = {
  eventType: CLOUD_CONNECT_LINK_CLICKED,
  schema: linkClickedSchema,
};
