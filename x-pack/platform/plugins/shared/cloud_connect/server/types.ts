/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface CloudConnectRoleAssignment {
  role_id: string;
  organization_id: string;
  all: boolean;
  resource_ids: string[];
}

export interface CloudConnectUserResponse {
  user: {
    user_id: number;
    organization_id: string;
    email: string;
    role_assignments: {
      cloud_connected_resource?: CloudConnectRoleAssignment[];
    };
  };
}

export interface SelfManagedCluster {
  id: string;
  name: string;
  version: string;
}

export interface SelfManagedClusterLicense {
  type: string;
  uid: string;
}

export interface OnboardClusterRequest {
  self_managed_cluster: SelfManagedCluster;
  license: SelfManagedClusterLicense;
  name?: string;
}

export interface UpdateClusterRequest extends OnboardClusterRequest {
  services?: {
    auto_ops?: { enabled: boolean };
    eis?: { enabled: boolean };
  };
}

export interface ServiceConfig {
  enabled: boolean;
  supported: boolean;
  config?: {
    region_id?: string;
  };
}

export interface SubscriptionResponse {
  state: string;
}

export interface OnboardClusterResponse {
  id: string;
  name: string;
  metadata: {
    created_at: string;
    created_by: string;
    organization_id: string;
    subscription?: string;
  };
  self_managed_cluster: SelfManagedCluster;
  license: SelfManagedClusterLicense;
  services: {
    auto_ops?: ServiceConfig;
    eis?: ServiceConfig;
  };
  key?: string;
  keys?: {
    eis: string;
  };
}

export interface ApiKeyValidationResult {
  isClusterScoped: boolean;
  hasValidScope: boolean;
  errorMessage?: string;
  clusterId?: string;
}

export interface CloudConnectApiKey {
  apiKey: string;
  clusterId: string;
  createdAt: string;
  updatedAt: string;
}
