/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/common';
import type { ManagementAppLocatorParams } from '@kbn/management-plugin/common/locator';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { DataQualityLocatorParams } from '@kbn/deeplinks-observability';
import {
  datasetQualityUrlSchemaV1,
  DATA_QUALITY_URL_STATE_KEY,
  deepCompactObject,
} from '@kbn/data-quality/common';

interface LocatorPathConstructionParams {
  locatorParams: DataQualityLocatorParams;
  useHash: boolean;
  managementLocator: LocatorPublic<ManagementAppLocatorParams>;
}

export const constructDatasetQualityLocatorPath = async (params: LocatorPathConstructionParams) => {
  const {
    locatorParams: { filters },
    useHash,
    managementLocator,
  } = params;

  const pageState = datasetQualityUrlSchemaV1.urlSchemaRT.encode(
    deepCompactObject({
      v: 1,
      filters,
    })
  );

  const managementPath = await managementLocator.getLocation({
    sectionId: 'data',
    appId: 'data_quality',
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
