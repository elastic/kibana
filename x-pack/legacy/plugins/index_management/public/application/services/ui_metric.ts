/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { UiStatsMetricType } from '@kbn/analytics';
import { UsageCollectionSetup } from '../../../../../../../src/plugins/usage_collection/public';
import { IndexMgmtMetricsType } from '../../types';

let uiMetricService: UiMetricService<IndexMgmtMetricsType>;

export class UiMetricService<T extends string> {
  private appName: string;
  private usageCollection: UsageCollectionSetup | undefined;

  constructor(appName: string) {
    this.appName = appName;
  }

  public setup(usageCollection: UsageCollectionSetup) {
    this.usageCollection = usageCollection;
  }

  private track(type: T, name: string) {
    if (!this.usageCollection) {
      throw Error('UiMetricService not initialized.');
    }
    this.usageCollection.reportUiStats(this.appName, type as UiStatsMetricType, name);
  }

  public trackMetric(type: T, eventName: string) {
    return this.track(type, eventName);
  }
}

/**
 * To minimize the refactor to migrate to NP where all deps should be explicitely declared
 * we will export here the instance created in our plugin.ts setup() so other parts of the code can access it.
 *
 * TODO: Refactor the api.ts (convert it to a class with setup()) and detail_panel.ts (reducer) to explicitely declare their dependency on the UiMetricService
 * @param instance UiMetricService instance from our plugin.ts setup()
 */
export const setUiMetricServiceInstance = (instance: UiMetricService<IndexMgmtMetricsType>) => {
  uiMetricService = instance;
};

export const getUiMetricServiceInstance = () => {
  return uiMetricService;
};
