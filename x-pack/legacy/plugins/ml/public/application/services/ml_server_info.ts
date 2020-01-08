/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ml } from './ml_api_service';

export interface MlServerDefaults {
  anomaly_detectors: {
    categorization_examples_limit?: number;
    model_memory_limit?: string;
    model_snapshot_retention_days?: number;
  };
  datafeeds: { scroll_size?: number };
}

export interface MlServerLimits {
  max_model_memory_limit?: string;
}

export interface CloudInfo {
  cloudId: string | null;
  isCloud: boolean;
}

let defaults: MlServerDefaults = {
  anomaly_detectors: {},
  datafeeds: {},
};
let limits: MlServerLimits = {};

const cloudInfo: CloudInfo = {
  cloudId: null,
  isCloud: false,
};

export async function loadMlServerInfo() {
  try {
    const resp = await ml.mlInfo();
    defaults = resp.defaults;
    limits = resp.limits;
    cloudInfo.cloudId = resp.cloudId || null;
    cloudInfo.isCloud = resp.cloudId !== undefined;
    return { defaults, limits, cloudId: cloudInfo };
  } catch (error) {
    return { defaults, limits, cloudId: cloudInfo };
  }
}

export function getNewJobDefaults(): MlServerDefaults {
  return defaults;
}

export function getNewJobLimits(): MlServerLimits {
  return limits;
}

export function getCloudId(): string | null {
  return cloudInfo.cloudId;
}

export function isCloud(): boolean {
  return cloudInfo.isCloud;
}

export function getCloudDeploymentId(): string | null {
  if (cloudInfo.cloudId === null) {
    return null;
  }
  const tempCloudId = cloudInfo.cloudId.replace(/^.+:/, '');
  try {
    const matches = atob(tempCloudId).match(/^.+\$(.+)(?=\$)/);
    return matches !== null && matches.length === 2 ? matches[1] : null;
  } catch (error) {
    return null;
  }
}
