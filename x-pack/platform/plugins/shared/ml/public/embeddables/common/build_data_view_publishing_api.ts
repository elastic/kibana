/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type DataView } from '@kbn/data-views-plugin/common';
import { type DataViewsContract } from '@kbn/data-views-plugin/public';
import type { PublishingSubject } from '@kbn/presentation-publishing';
import type { Subscription } from 'rxjs';
import { BehaviorSubject, forkJoin, from, map, switchMap } from 'rxjs';
import { type AnomalyDetectorService } from '../../application/services/anomaly_detector_service';
import type { AnomalySwimLaneEmbeddableApi } from '../anomaly_swimlane/types';

export const buildDataViewPublishingApi = (
  services: { anomalyDetectorService: AnomalyDetectorService; dataViewsService: DataViewsContract },
  api: Pick<AnomalySwimLaneEmbeddableApi, 'jobIds'>,
  subscription: Subscription
): PublishingSubject<DataView[] | undefined> => {
  const dataViews$ = new BehaviorSubject<DataView[] | undefined>(undefined);

  subscription.add(
    api.jobIds
      .pipe(
        // Get job definitions
        switchMap((jobIds) => services.anomalyDetectorService.getJobs$(jobIds)),
        // Get unique indices from the datafeed configs
        map((jobs) => [...new Set(jobs.map((j) => j.datafeed_config!.indices).flat())]),
        switchMap((indices) =>
          forkJoin(
            indices.map((indexName) =>
              from(
                services.dataViewsService.find(`"${indexName}"`).then((r) => {
                  const dView = r.find((obj) =>
                    obj.getIndexPattern().toLowerCase().includes(indexName.toLowerCase())
                  );

                  return dView;
                })
              )
            )
          )
        ),
        map((results) => {
          return results.flat().filter((dView) => dView !== undefined) as DataView[];
        })
      )
      .subscribe(dataViews$)
  );

  return dataViews$;
};
