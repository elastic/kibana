/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';

import { DEFAULT_KBN_VERSION } from '../../../../common/constants';
import { useKibanaUiSetting } from '../../../lib/settings/use_kibana_ui_setting';
import { InfluencerInput, MlCapabilities } from '../types';
import { throwIfNotOk } from './throw_if_not_ok';

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
  headers: Record<string, string | undefined>,
  signal: AbortSignal
): Promise<MlCapabilities> => {
  const [kbnVersion] = useKibanaUiSetting(DEFAULT_KBN_VERSION);
  const response = await fetch(`${chrome.getBasePath()}/api/ml/ml_capabilities`, {
    method: 'GET',
    credentials: 'same-origin',
    headers: {
      'kbn-system-api': 'true',
      'content-Type': 'application/json',
      'kbn-xsrf': kbnVersion,
      ...headers,
    },
    signal,
  });
  await throwIfNotOk(response);
  return response.json();
};
