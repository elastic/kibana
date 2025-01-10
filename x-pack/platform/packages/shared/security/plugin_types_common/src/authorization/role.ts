/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeaturesPrivileges } from './features_privileges';

export interface RoleIndexPrivilege {
  names: string[];
  privileges: string[];
  field_security?: {
    grant?: string[];
    except?: string[];
  };
  query?: string;
}

export interface RoleRemoteIndexPrivilege extends RoleIndexPrivilege {
  clusters: string[];
}

export interface RoleKibanaPrivilege {
  spaces: string[];
  base: string[];
  feature: FeaturesPrivileges;
  _reserved?: string[];
}

export interface RoleRemoteClusterPrivilege {
  clusters: string[];
  privileges: string[];
}

export interface Role {
  name: string;
  description?: string;
  elasticsearch: {
    cluster: string[];
    remote_cluster?: RoleRemoteClusterPrivilege[];
    indices: RoleIndexPrivilege[];
    remote_indices?: RoleRemoteIndexPrivilege[];
    run_as: string[];
  };
  kibana: RoleKibanaPrivilege[];
  metadata?: {
    [anyKey: string]: any;
  };
  transient_metadata?: {
    [anyKey: string]: any;
  };
  _transform_error?: string[];
  _unrecognized_applications?: string[];
}
