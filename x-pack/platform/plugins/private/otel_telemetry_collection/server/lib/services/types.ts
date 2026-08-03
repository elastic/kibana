/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalType } from '../constants';

export interface OtelPerServiceResult {
  signal: SignalType;
  service_id: string;
  environment: string;
  doc_count: number;
  sdk_names: string[];
  sdk_languages: string[];
  sdk_versions: string[];
  distro_names: string[];
  distro_versions: string[];
  cloud_providers: string[];
  cloud_platforms: string[];
  cloud_regions: string[];
  cloud_az: string[];
  host_archs: string[];
  os_types: string[];
  os_names: string[];
  os_versions: string[];
  os_descriptions: string[];
  device_manufacturers: string[];
  device_model_names: string[];
  browser_platforms: string[];
  user_agent_originals: string[];
  runtime_names: string[];
  runtime_versions: string[];
  runtime_descriptions: string[];
  executable_names: string[];
  webengine_names: string[];
  webengine_versions: string[];
  webengine_descriptions: string[];
  scope_names: string[];
  upstream_cluster: string[];
  has_k8s: boolean;
  has_container: boolean;
}

export interface OtelPerServicePayload {
  batch_index: number;
  batch_total: number;
  results: OtelPerServiceResult[];
}
