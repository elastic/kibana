/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorDefinition } from '@kbn/share-plugin/public';
import {
  DataQualityDetailsLocatorParams,
  DATA_QUALITY_DETAILS_LOCATOR_ID,
} from '@kbn/deeplinks-observability';
import { DataQualityLocatorDependencies } from './types';
import { constructDatasetQualityDetailsLocatorPath } from './construct_dataset_quality_details_locator_path';

export class DatasetQualityDetailsLocatorDefinition
  implements LocatorDefinition<DataQualityDetailsLocatorParams>
{
  public readonly id = DATA_QUALITY_DETAILS_LOCATOR_ID;

  constructor(protected readonly deps: DataQualityLocatorDependencies) {}

  public readonly getLocation = async (params: DataQualityDetailsLocatorParams) => {
    const { useHash, managementLocator } = this.deps;
    return await constructDatasetQualityDetailsLocatorPath({
      useHash,
      managementLocator,
      locatorParams: params,
    });
  };
}
