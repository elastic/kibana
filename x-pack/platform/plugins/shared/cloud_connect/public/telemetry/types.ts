/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceType } from '../types';

// Note: Cluster ID and version are automatically sent with all telemetry events
// by Kibana's analytics service, so we don't need to include them here.

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ClusterConnectedProps {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ClusterDisconnectedProps {}

export interface ServiceToggledProps {
  service_type: ServiceType;
  region_id?: string;
}

export interface LinkClickedProps {
  destination_type: string;
  service_type?: ServiceType;
}
