/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, combineLatest, EMPTY, type Observable, Subscription } from 'rxjs';
import { catchError, debounceTime, map, startWith, switchMap, tap } from 'rxjs';
import type { DataPublicPluginStart, TimefilterContract } from '@kbn/data-plugin/public';
import { isRunningResponse } from '@kbn/data-plugin/public';
import type {
  RuleRegistrySearchRequest,
  RuleRegistrySearchResponse,
} from '@kbn/rule-registry-plugin/common';
import {
  ALERT_DURATION,
  ALERT_END,
  ALERT_RULE_NAME,
  ALERT_RULE_TYPE_ID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_UUID,
} from '@kbn/rule-data-utils';
import { isDefined } from '@kbn/ml-is-defined';
import { getSeverityColor } from '@kbn/ml-anomaly-utils';
import {
  ALERT_ANOMALY_DETECTION_JOB_ID,
  ALERT_ANOMALY_SCORE,
  ALERT_ANOMALY_TIMESTAMP,
  ML_ALERT_TYPES,
  ML_RULE_TYPE_IDS,
  ML_VALID_CONSUMERS,
} from '../../../../common/constants/alerts';
import { StateService } from '../../services/state_service';
import type { AnomalyTimelineStateService } from '../anomaly_timeline_state_service';

export interface AnomalyDetectionAlert {
  id: string;
  [ALERT_ANOMALY_SCORE]: number;
  [ALERT_ANOMALY_DETECTION_JOB_ID]: string;
  [ALERT_ANOMALY_TIMESTAMP]: number;
  [ALERT_START]: number;
  [ALERT_END]: number | undefined;
  [ALERT_RULE_NAME]: string;
  [ALERT_STATUS]: string;
  [ALERT_DURATION]: number;
  // Additional fields for the UI
  color: string;
}

export type AlertsQuery = Exclude<RuleRegistrySearchRequest['query'], undefined>;

export class AnomalyDetectionAlertsStateService extends StateService {
  /**
   * Subject that holds the anomaly detection alerts from the alert-as-data index.
   * @private
   */
  private readonly _aadAlerts$ = new BehaviorSubject<AnomalyDetectionAlert[]>([]);

  private readonly _isLoading$ = new BehaviorSubject<boolean>(true);

  constructor(
    private readonly _anomalyTimelineStateServices: AnomalyTimelineStateService,
    private readonly data: DataPublicPluginStart,
    private readonly timefilter: TimefilterContract
  ) {
    super();

    this.selectedAlerts$ = combineLatest([
      this._aadAlerts$,
      this._anomalyTimelineStateServices.getSelectedCells$().pipe(map((cells) => cells?.times)),
    ]).pipe(
      map(([alerts, selectedTimes]) => {
        if (!Array.isArray(selectedTimes)) return null;

        return alerts.filter(
          (alert) =>
            alert[ALERT_ANOMALY_TIMESTAMP] >= selectedTimes[0] * 1000 &&
            alert[ALERT_ANOMALY_TIMESTAMP] <= selectedTimes[1] * 1000
        );
      })
    );

    const timeUpdates$ = this.timefilter.getTimeUpdate$().pipe(
      startWith(null),
      map(() => this.timefilter.getTime())
    );

    this.alertsQuery$ = combineLatest([
      this._anomalyTimelineStateServices.getSwimLaneJobs$(),
      timeUpdates$,
    ]).pipe(
      // Create a result query from the input
      map(([selectedJobs, timeRange]) => {
        return {
          bool: {
            filter: [
              {
                term: {
                  [ALERT_RULE_TYPE_ID]: ML_ALERT_TYPES.ANOMALY_DETECTION,
                },
              },
              {
                range: {
                  [ALERT_ANOMALY_TIMESTAMP]: {
                    gte: timeRange.from,
                    lte: timeRange.to,
                  },
                },
              },
              {
                terms: {
                  [ALERT_ANOMALY_DETECTION_JOB_ID]: selectedJobs.map((job) => job.id),
                },
              },
            ],
          },
        } as AlertsQuery;
      })
    );

    this._init();
  }

  /**
   * Count the number of alerts by status.
   * @param alerts
   */
  public countAlertsByStatus(alerts: AnomalyDetectionAlert[]): Record<string, number> {
    return alerts.reduce(
      (acc, alert) => {
        if (!isDefined(acc[alert[ALERT_STATUS]])) {
          acc[alert[ALERT_STATUS]] = 0;
        } else {
          acc[alert[ALERT_STATUS]]++;
        }
        return acc;
      },
      { active: 0, recovered: 0 } as Record<string, number>
    );
  }

  public readonly anomalyDetectionAlerts$: Observable<AnomalyDetectionAlert[]> =
    this._aadAlerts$.asObservable();

  /**
   * Query for fetching alerts data based on the job selection and time range.
   */
  public readonly alertsQuery$: Observable<AlertsQuery>;

  public readonly isLoading$: Observable<boolean> = this._isLoading$.asObservable();

  /**
   * Observable for the alerts within the swim lane selection.
   */
  public readonly selectedAlerts$: Observable<AnomalyDetectionAlert[] | null>;

  public readonly countByStatus$: Observable<Record<string, number>> = this._aadAlerts$.pipe(
    map((alerts) => {
      return this.countAlertsByStatus(alerts);
    })
  );

  protected _initSubscriptions(): Subscription {
    const subscription = new Subscription();

    subscription.add(
      this.alertsQuery$
        .pipe(
          tap(() => {
            this._isLoading$.next(true);
          }),
          debounceTime(300),
          switchMap((query) => {
            return this.data.search
              .search<RuleRegistrySearchRequest, RuleRegistrySearchResponse>(
                {
                  ruleTypeIds: ML_RULE_TYPE_IDS,
                  consumers: ML_VALID_CONSUMERS,
                  query,
                },
                { strategy: 'privateRuleRegistryAlertsSearchStrategy' }
              )
              .pipe(
                catchError((error) => {
                  // Catch error to prevent the observable from completing
                  return EMPTY;
                })
              );
          })
        )
        .subscribe((response) => {
          if (!isRunningResponse(response)) {
            this._aadAlerts$.next(
              response.rawResponse.hits.hits
                .map(({ fields }) => {
                  if (!isDefined(fields)) return;
                  const anomalyScore = Number(fields[ALERT_ANOMALY_SCORE][0]);
                  return {
                    id: fields[ALERT_UUID][0],
                    [ALERT_RULE_NAME]: fields[ALERT_RULE_NAME][0],
                    [ALERT_ANOMALY_SCORE]: anomalyScore,
                    [ALERT_ANOMALY_DETECTION_JOB_ID]: fields[ALERT_ANOMALY_DETECTION_JOB_ID][0],
                    [ALERT_ANOMALY_TIMESTAMP]: new Date(
                      fields[ALERT_ANOMALY_TIMESTAMP][0]
                    ).getTime(),
                    [ALERT_START]: fields[ALERT_START][0],
                    // Can be undefined if the alert is still active
                    [ALERT_END]: fields[ALERT_END]?.[0],
                    [ALERT_STATUS]: fields[ALERT_STATUS][0],
                    [ALERT_DURATION]: fields[ALERT_DURATION][0],
                    color: getSeverityColor(anomalyScore),
                  };
                })
                .filter(isDefined)
            );
            this._isLoading$.next(false);
          }
        })
    );

    return subscription;
  }
}
