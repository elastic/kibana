/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';

import { useKibanaUiSetting } from '../../../lib/settings/use_kibana_ui_setting';
import { DEFAULT_KBN_VERSION } from '../../../../common/constants';
import { Anomalies, InfluencerInput, CriteriaFields } from '../types';
import { throwIfNotOk } from './throw_if_not_ok';
export interface Body {
  jobIds: string[];
  criteriaFields: CriteriaFields[];
  influencers: InfluencerInput[];
  aggregationInterval: string;
  threshold: number;
  earliestMs: number;
  latestMs: number;
  dateFormatTz: string;
  maxRecords: number;
  maxExamples: number;
}

export const anomaliesTableData = async (
  body: Body,
  headers: Record<string, string | undefined>,
  signal: AbortSignal
): Promise<Anomalies> => {
  const [kbnVersion] = useKibanaUiSetting(DEFAULT_KBN_VERSION);
  const response = await fetch(`${chrome.getBasePath()}/api/ml/results/anomalies_table_data`, {
    method: 'POST',
    credentials: 'same-origin',
    body: JSON.stringify(body),
    headers: {
      'kbn-system-api': 'true',
      'content-Type': 'application/json',
      'kbn-xsrf': kbnVersion,
      ...headers,
    },
    signal,
  });
  await throwIfNotOk(response);
  return await response.json();
};
