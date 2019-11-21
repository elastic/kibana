/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';

import { InfluencerInput, MlCapabilities } from '../types';
import { throwIfNotOk } from '../../../hooks/api/api';

export interface Body {
  jobIds: string[];
  criteriaFields: string[];
  influencers: InfluencerInput[];
  aggregationInterval: string;
  threshold: number;
  earliestMs: number;
  latestMs: number;
  dateFormatTz: string;
  maxRecords: number;
  maxExamples: number;
}

export const getMlCapabilities = async (
  kbnVersion: string,
  signal: AbortSignal
): Promise<MlCapabilities> => {
  const response = await fetch(`${chrome.getBasePath()}/api/ml/ml_capabilities`, {
    method: 'GET',
    credentials: 'same-origin',
    headers: {
      'kbn-system-api': 'true',
      'content-Type': 'application/json',
      'kbn-xsrf': kbnVersion,
      'kbn-version': kbnVersion,
    },
    signal,
  });
  await throwIfNotOk(response);
  return response.json();
};
