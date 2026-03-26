/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@elastic/ebt';
import type {
  ClusterConnectedProps,
  ClusterDisconnectedProps,
  ServiceToggledProps,
  LinkClickedProps,
} from './types';

export const clusterConnectedSchema: RootSchema<ClusterConnectedProps> = {};

export const clusterDisconnectedSchema: RootSchema<ClusterDisconnectedProps> = {};

export const serviceToggledSchema: RootSchema<ServiceToggledProps> = {
  service_type: {
    type: 'keyword',
    _meta: {
      description: 'The type of cloud service (derived from ClusterDetails services keys)',
    },
  },
  region_id: {
    type: 'keyword',
    _meta: {
      description: 'The cloud region identifier for the service',
      optional: true,
    },
  },
};

export const linkClickedSchema: RootSchema<LinkClickedProps> = {
  destination_type: {
    type: 'keyword',
    _meta: {
      description:
        'The destination type of the link (e.g., cloud_connect_docs, cloud_signup, service_documentation, service_portal, migration_docs, onboarding_docs)',
    },
  },
  service_type: {
    type: 'keyword',
    _meta: {
      description:
        'The service associated with the link (derived from ClusterDetails services keys), if applicable',
      optional: true,
    },
  },
};
