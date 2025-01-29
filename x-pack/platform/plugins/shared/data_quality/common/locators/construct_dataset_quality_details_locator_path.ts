/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/common';
import { ManagementAppLocatorParams } from '@kbn/management-plugin/common/locator';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { DataQualityDetailsLocatorParams } from '@kbn/deeplinks-observability';
import { datasetQualityDetailsUrlSchemaV1, DATA_QUALITY_URL_STATE_KEY } from '../url_schema';
import { deepCompactObject } from '../utils/deep_compact_object';

interface LocatorPathConstructionParams {
  locatorParams: DataQualityDetailsLocatorParams;
  useHash: boolean;
  managementLocator: LocatorPublic<ManagementAppLocatorParams>;
}

export const constructDatasetQualityDetailsLocatorPath = async (
  params: LocatorPathConstructionParams
) => {
  const { locatorParams, useHash, managementLocator } = params;

  const pageState = datasetQualityDetailsUrlSchemaV1.urlSchemaRT.encode(
    deepCompactObject({
      v: 1,
      ...locatorParams,
    })
  );

  const managementPath = await managementLocator.getLocation({
    sectionId: 'data',
    appId: 'data_quality/details',
  });

  const path = setStateToKbnUrl(
    DATA_QUALITY_URL_STATE_KEY,
    pageState,
    { useHash, storeInHashQuery: false },
    `${managementPath.app}${managementPath.path}`
  );

  return {
    app: '',
    path,
    state: {},
  };
};
