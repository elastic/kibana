/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import { ML_PAGES } from '../../../common/constants/locator';
import type { ChangePointDetectionUrlState } from '../../../common/types/locator';

/**
 * Creates URL to the Change Point Detection page
 */
export function formatChangePointDetectionUrl(
  appBasePath: string,
  params: ChangePointDetectionUrlState['pageState']
): string {
  let url = `${appBasePath}/${ML_PAGES.AIOPS_CHANGE_POINT_DETECTION}`;

  if (!params?.fieldConfigs) {
    throw new Error('Field configs are required to create a change point detection URL');
  }

  if (!params.index) {
    throw new Error('Data view is required to create a change point detection URL');
  }

  url = `${url}?index=${params.index}`;

  const { timeRange, fieldConfigs } = params;

  const appState = {
    fieldConfigs,
  };
  const queryState = {
    time: timeRange,
  };

  url = setStateToKbnUrl('_g', queryState, { useHash: false, storeInHashQuery: false }, url);
  url = setStateToKbnUrl(
    '_a',
    { changePoint: appState },
    { useHash: false, storeInHashQuery: false },
    url
  );

  return url;
}
