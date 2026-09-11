/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import pMap from 'p-map';
import pRetry from 'p-retry';
import { isEmpty } from 'lodash';

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import { isNonLocalIndexName } from '@kbn/es-query';
import type { STATUS_VALUES } from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import {
  ALERT_WORKFLOW_REASON,
  ALERT_WORKFLOW_STATUS,
  ALERT_WORKFLOW_STATUS_UPDATED_AT,
} from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import type { MgetResponse } from '@elastic/elasticsearch/lib/api/types';
import type { AlertsClient } from '@kbn/rule-registry-plugin/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { CaseStatuses } from '../../../common/types/domain';
import { MAX_ALERTS_PER_CASE, MAX_CONCURRENT_SEARCHES } from '../../../common/constants';
import { createCaseError } from '../../common/error';
import type { AlertInfo } from '../../common/types';
import type {
  RemoveCaseIdFromAlertsRequest,
  UpdateAlertCasesRequest,
  UpdateAlertStatusRequest,
} from '../../client/alerts/types';
import type { AggregationBuilder, AggregationResponse } from '../../client/metrics/types';
import type { CasesEventBus } from '../../events/event_bus';

export class AlertService {
  constructor(
    private readonly scopedClusterClient: ElasticsearchClient,
    private readonly logger: Logger,
    private readonly alertsClient: PublicMethodsOf<AlertsClient>,
    private readonly casesEventBus?: CasesEventBus,
    private readonly request?: KibanaRequest
  ) {}

  public async executeAggregations({
    aggregationBuilders,
    alerts,
  }: {
    aggregationBuilders: Array<AggregationBuilder<unknown>>;
    alerts: AlertIdIndex[];
  }): Promise<AggregationResponse> {
    try {
      const { ids, indices } = AlertService.getUniqueIdsIndices(alerts);

      const builtAggs = aggregationBuilders.reduce((acc, agg) => {
        return Object.assign(acc, agg.build());
      }, {});

      const res = await this.scopedClusterClient.search({
        index: indices,
        ignore_unavailable: true,
        query: { ids: { values: ids } },
        size: 0,
        aggregations: builtAggs,
      });

      return res.aggregations;
    } catch (error) {
      const aggregationNames = aggregationBuilders.map((agg) => agg.getName());

      throw createCaseError({
        message: `Failed to execute aggregations [${aggregationNames.join(',')}]: ${error}`,
        error,
        logger: this.logger,
      });
    }
  }

  private static getUniqueIdsIndices(alerts: AlertIdIndex[]): { ids: string[]; indices: string[] } {
    const { ids, indices } = alerts.reduce(
      (acc, alert) => {
        acc.ids.add(alert.id);
        acc.indices.add(alert.index);
        return acc;
      },
      { ids: new Set<string>(), indices: new Set<string>() }
    );

    return {
      ids: Array.from(ids),
      indices: Array.from(indices),
    };
  }

  public async updateAlertsStatus(alerts: UpdateAlertStatusRequest[]): Promise<number> {
    try {
      const bucketedAlerts = this.bucketAlerts(alerts);
      const indexBuckets = Array.from(bucketedAlerts.entries());

      let prefetchResult:
        | { previousStatusMap: Map<string, STATUS_VALUES>; changeableKeys: Set<string> }
        | undefined;
      if (this.casesEventBus?.hasAlertStatusChangedListeners() && this.request) {
        try {
          prefetchResult = await pRetry(() => this.prefetchPreviousStatuses(alerts), {
            retries: 3,
          });
        } catch (err) {
          this.logger.warn(
            `Failed to prefetch previous alert statuses for Cases event bus: ${err}`
          );
        }
      }

      const updateResults = await pMap(
        indexBuckets,
        async (indexBucket: [string, StatusAndReasonBuckets]) => this.updateByQuery(indexBucket),
        { concurrency: MAX_CONCURRENT_SEARCHES }
      );

      if (this.casesEventBus && this.request && prefetchResult !== undefined) {
        // Isolate event dispatch: a listener exception must not change the mutation result.
        try {
          this.emitStatusChangedEvents(
            alerts,
            prefetchResult.previousStatusMap,
            prefetchResult.changeableKeys,
            this.casesEventBus,
            this.request
          );
        } catch (err) {
          this.logger.error(`Failed to emit alertStatusChanged events: ${err}`);
        }
      }

      return updateResults.reduce((acc, updatedCount) => acc + updatedCount, 0);
    } catch (error) {
      throw createCaseError({
        message: `Failed to update alert status ids: ${JSON.stringify(alerts)}: ${error}`,
        error,
        logger: this.logger,
      });
    }
  }

  /**
   * True when the document has a non-null workflow status field. `getUpdateAlertsStatusScript`
   * sets `ctx.op = 'noop'` when both `kibana.alert.workflow_status` and `signal.status` are
   * null or missing, so such documents never transition and must not emit status events.
   */
  private static hasWorkflowStatusField(source: unknown): boolean {
    if (typeof source !== 'object' || source === null) return false;
    const s = source as Record<string, unknown>;
    if (s[ALERT_WORKFLOW_STATUS] != null) return true;
    const signal = s.signal;
    return (
      typeof signal === 'object' &&
      signal !== null &&
      (signal as Record<string, unknown>).status != null
    );
  }

  private static parseWorkflowStatus(source: unknown): STATUS_VALUES | undefined {
    if (typeof source !== 'object' || source === null) return undefined;
    const s = source as Record<string, unknown>;
    const modern = s[ALERT_WORKFLOW_STATUS];
    if (modern != null) {
      // A non-null modern field is authoritative; do not fall back to signal.status.
      if (
        modern === 'open' ||
        modern === 'acknowledged' ||
        modern === 'in-progress' ||
        modern === 'closed'
      ) {
        return modern;
      }
      return undefined;
    }
    // Legacy .siem-signals documents only have signal.status; use it as a fallback.
    const signal = s.signal;
    if (typeof signal === 'object' && signal !== null) {
      const legacy = (signal as Record<string, unknown>).status;
      if (
        legacy === 'open' ||
        legacy === 'acknowledged' ||
        legacy === 'in-progress' ||
        legacy === 'closed'
      ) {
        return legacy as STATUS_VALUES;
      }
    }
    return undefined;
  }

  private async prefetchPreviousStatuses(alerts: UpdateAlertStatusRequest[]): Promise<{
    previousStatusMap: Map<string, STATUS_VALUES>;
    // Keys of documents the update script can actually mutate, i.e. found AND carrying a
    // non-null status field. Narrower than "found" on purpose: a status-less attachment is
    // a guaranteed Elasticsearch no-op and must not start a workflow.
    changeableKeys: Set<string>;
  }> {
    const docs = alerts.reduce<Array<{ _id: string; _index: string }>>((acc, a) => {
      if (!AlertService.isEmptyAlert(a)) {
        acc.push({ _id: a.id, _index: a.index });
      }
      return acc;
    }, []);
    if (docs.length === 0) return { previousStatusMap: new Map(), changeableKeys: new Set() };
    const response = await this.scopedClusterClient.mget({
      docs,
      _source_includes: [ALERT_WORKFLOW_STATUS, 'signal.status'],
    });
    const previousStatusMap = new Map<string, STATUS_VALUES>();
    const changeableKeys = new Set<string>();
    for (const doc of response.docs) {
      if ('found' in doc && doc.found && doc._id != null && doc._index != null) {
        const key = `${doc._index}:${doc._id}`;
        // Track status-field presence separately from parseWorkflowStatus, which returns
        // undefined both for an invalid non-null status (a real, repairable transition)
        // and for a document with no status field at all (an Elasticsearch no-op).
        if (AlertService.hasWorkflowStatusField(doc._source)) {
          changeableKeys.add(key);
        }
        const previousStatus = AlertService.parseWorkflowStatus(doc._source);
        if (previousStatus !== undefined) {
          previousStatusMap.set(key, previousStatus);
        }
      }
    }
    return { previousStatusMap, changeableKeys };
  }

  private emitStatusChangedEvents(
    alerts: UpdateAlertStatusRequest[],
    previousStatusMap: Map<string, STATUS_VALUES>,
    changeableKeys: Set<string>,
    casesEventBus: CasesEventBus,
    request: KibanaRequest
  ) {
    const idToIndex = new Map<string, string>();
    const byStatus = new Map<STATUS_VALUES, string[]>();
    for (const alert of alerts) {
      if (!AlertService.isEmptyAlert(alert)) {
        const translatedStatus = this.translateStatus(alert);
        const key = `${alert.index}:${alert.id}`;
        const previousStatus = previousStatusMap.get(key);
        // Emit only for alerts the update script can mutate (found, with a non-null status
        // field) whose status is actually changing. Alerts with an unrecognized stored
        // status (previousStatus === undefined) are included — the mutation still succeeds
        // and the event schema does not require a previousStatuses row for every emitted ID.
        const isActualChange = changeableKeys.has(key) && previousStatus !== translatedStatus;
        if (isActualChange) {
          idToIndex.set(alert.id, alert.index);
          const bucket = byStatus.get(translatedStatus);
          if (bucket !== undefined) {
            bucket.push(alert.id);
          } else {
            byStatus.set(translatedStatus, [alert.id]);
          }
        }
      }
    }
    for (const [status, alertIds] of byStatus) {
      const indicesSet = new Set<string>();
      for (const id of alertIds) {
        const index = idToIndex.get(id);
        if (index !== undefined) {
          indicesSet.add(index);
        }
      }
      casesEventBus.emitAlertStatusChanged(request, {
        alertIds,
        status,
        previousStatuses: alertIds.flatMap((id) => {
          const index = idToIndex.get(id);
          const previousStatus =
            index !== undefined ? previousStatusMap.get(`${index}:${id}`) : undefined;
          return previousStatus !== undefined ? [{ id, previousStatus }] : [];
        }),
        alertIdToIndex: Object.fromEntries(idToIndex),
        indices: Array.from(indicesSet),
      });
    }
  }

  private bucketAlerts(alerts: UpdateAlertStatusRequest[]): Map<string, StatusAndReasonBuckets> {
    return alerts.reduce<Map<string, StatusAndReasonBuckets>>((acc, alert) => {
      if (AlertService.isEmptyAlert(alert)) {
        return acc;
      }

      const translatedAlert = { ...alert, status: this.translateStatus(alert) };
      const statusAndReasonBuckets = acc.get(translatedAlert.index);

      if (!statusAndReasonBuckets) {
        acc.set(translatedAlert.index, createStatusAndReasonBuckets(translatedAlert));
      } else {
        updateIndexEntryWithStatusAndReason(statusAndReasonBuckets, translatedAlert);
      }

      return acc;
    }, new Map());
  }

  private static isEmptyAlert(alert: AlertInfo): boolean {
    return isEmpty(alert.id) || isEmpty(alert.index);
  }

  private translateStatus(alert: UpdateAlertStatusRequest): STATUS_VALUES {
    const translatedStatuses: Record<string, STATUS_VALUES> = {
      [CaseStatuses.open]: 'open',
      [CaseStatuses['in-progress']]: 'acknowledged',
      [CaseStatuses.closed]: 'closed',
    };

    const translatedStatus = translatedStatuses[alert.status];
    if (!translatedStatus) {
      this.logger.error(
        `Unable to translate case status ${alert.status} during alert update: ${JSON.stringify(
          alert
        )}`
      );
    }
    return translatedStatus ?? 'open';
  }

  private async updateByQuery([index, statusAndReasonBuckets]: [
    string,
    StatusAndReasonBuckets
  ]): Promise<number> {
    const statusBuckets = Array.from(statusAndReasonBuckets.entries());
    const updateRequests = statusBuckets.flatMap(([status, reasonToAlerts]) =>
      Array.from(reasonToAlerts.entries()).map(async ([reason, alerts]) => {
        const updateResponse = await this.scopedClusterClient.updateByQuery({
          index,
          conflicts: 'abort',
          script: getUpdateAlertsStatusScript(status, reason),
          // the query here will contain all the ids that have the same status (and reason for closed)
          query: { ids: { values: alerts.map(({ id }) => id) } },
          ignore_unavailable: true,
        });

        return updateResponse?.updated ?? 0;
      })
    );

    const updatesForIndex = await Promise.all(updateRequests);
    return updatesForIndex.reduce((acc, updatedCount) => acc + updatedCount, 0);
  }

  private getNonEmptyAlerts(alerts: AlertInfo[]): AlertInfo[] {
    return alerts.filter((alert) => !AlertService.isEmptyAlert(alert));
  }

  public async getAlerts(alertsInfo: AlertInfo[]): Promise<MgetResponse<Alert> | undefined> {
    try {
      const docs = alertsInfo
        .filter((alert) => !AlertService.isEmptyAlert(alert))
        .slice(0, MAX_ALERTS_PER_CASE)
        .map((alert) => ({ _id: alert.id, _index: alert.index }));

      if (docs.length <= 0) {
        return;
      }

      const results = await this.scopedClusterClient.mget<Alert>({ docs });

      return results;
    } catch (error) {
      throw createCaseError({
        message: `Failed to retrieve alerts ids: ${JSON.stringify(alertsInfo)}: ${error}`,
        error,
        logger: this.logger,
      });
    }
  }

  public async bulkUpdateCases({ alerts, caseIds }: UpdateAlertCasesRequest): Promise<void> {
    try {
      const nonEmptyAlerts = this.getNonEmptyAlerts(alerts);

      if (nonEmptyAlerts.length <= 0) {
        return;
      }

      await this.alertsClient.bulkUpdateCases({
        alerts: nonEmptyAlerts,
        caseIds,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to add case info to alerts for caseIds ${caseIds}: ${error}`,
        error,
        logger: this.logger,
      });
    }
  }

  public async removeCaseIdFromAlerts({
    alerts,
    caseId,
  }: RemoveCaseIdFromAlertsRequest): Promise<void> {
    try {
      const nonEmptyAlerts = this.getNonEmptyAlerts(alerts);

      if (nonEmptyAlerts.length <= 0) {
        return;
      }

      await this.alertsClient.removeCaseIdFromAlerts({
        alerts: nonEmptyAlerts,
        caseId,
      });
    } catch (error) {
      /**
       * We intentionally do not throw an error.
       * Users should be able to remove alerts from a case even
       * in the event of an error produced by the alerts client
       */
      this.logger.error(`Failed removing case ${caseId} from alerts: ${error}`);
    }
  }

  public async removeCaseIdsFromAllAlerts({ caseIds }: { caseIds: string[] }): Promise<void> {
    try {
      if (caseIds.length <= 0) {
        return;
      }

      await this.alertsClient.removeCaseIdsFromAllAlerts({
        caseIds,
      });
    } catch (error) {
      /**
       * We intentionally do not throw an error.
       * Users should be able to remove alerts from cases even
       * in the event of an error produced by the alerts client
       */
      this.logger.error(`Failed removing cases ${caseIds} for all alerts: ${error}`);
    }
  }

  public async ensureAlertsAuthorized({ alerts }: { alerts: AlertInfo[] }): Promise<void> {
    try {
      const nonEmptyAlerts = this.getNonEmptyAlerts(alerts);

      if (nonEmptyAlerts.length <= 0) {
        return;
      }

      this.rejectNonLocalIndices(nonEmptyAlerts, 'an alert');

      await this.alertsClient.ensureAllAlertsAuthorizedRead({
        alerts: nonEmptyAlerts,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to authorize alerts: ${error}`,
        error,
        logger: this.logger,
      });
    }
  }

  /**
   * Rejects CPS/CCS index references before any `mget` — rule_registry's own authorization check
   * silently skips (doesn't throw) a hit missing `_source`, which is what a cross-project `mget` returns.
   */
  private rejectNonLocalIndices(alerts: AlertInfo[], label: string): void {
    const nonLocalAlert = alerts.find((alert) => isNonLocalIndexName(alert.index));

    if (nonLocalAlert != null) {
      throw Boom.badRequest(
        `Cannot attach ${label} from a linked project or remote cluster index: ${nonLocalAlert.index}`
      );
    }
  }

  /**
   * Existence check for non-alert indexed attachments (events) — no alerting RBAC, and CPS/CCS
   * refs are rejected before `mget`.
   */
  public async ensureDocumentsExist({ alerts }: { alerts: AlertInfo[] }): Promise<void> {
    try {
      const nonEmptyAlerts = this.getNonEmptyAlerts(alerts);

      if (nonEmptyAlerts.length <= 0) {
        return;
      }

      this.rejectNonLocalIndices(nonEmptyAlerts, 'an event');

      const results = await this.getAlerts(nonEmptyAlerts);
      const missingEventIds = (results?.docs ?? [])
        .filter((doc) => !('found' in doc && doc.found))
        .map((doc) => doc._id);

      if (missingEventIds.length > 0) {
        throw Boom.badRequest(`Referenced event(s) not found: ${missingEventIds.join(', ')}`);
      }
    } catch (error) {
      throw createCaseError({
        message: `Failed to verify referenced events exist: ${error}`,
        error,
        logger: this.logger,
      });
    }
  }
}

interface TranslatedUpdateAlertRequest {
  id: string;
  index: string;
  status: STATUS_VALUES;
  closingReason?: string;
}
/**
 * Buckets translated alerts by status, and then by close reason.
 * Non-closed statuses use the `undefined` reason bucket.
 */
type StatusAndReasonBuckets = Map<
  STATUS_VALUES,
  Map<string | undefined, TranslatedUpdateAlertRequest[]>
>;

const getUpdateAlertsStatusScript = (status: STATUS_VALUES, reason?: string) => ({
  source: `
    boolean statusChanged = false;
    boolean signalStatusChanged = false;
    if (ctx._source['${ALERT_WORKFLOW_STATUS}'] != null && ctx._source['${ALERT_WORKFLOW_STATUS}'] != params.status) {
      statusChanged = true;
      ctx._source['${ALERT_WORKFLOW_STATUS}'] = params.status;
      ctx._source['${ALERT_WORKFLOW_STATUS_UPDATED_AT}'] = params.updatedAt;
      if (params.reason != null) {
          ctx._source['${ALERT_WORKFLOW_REASON}'] = params.reason;
      }
      if (params.shouldRemoveWorkflowReason) {
        ctx._source.remove('${ALERT_WORKFLOW_REASON}');
      }
    }
    if (
      ctx._source.signal != null &&
      ctx._source.signal.status != null &&
      ctx._source.signal.status != params.status
    ) {
      signalStatusChanged = true;
      ctx._source.signal.status = params.status;
    }

    if (!statusChanged && !signalStatusChanged) {
      ctx.op = 'noop';
    }
  `,
  lang: 'painless',
  params: {
    status,
    updatedAt: new Date().toISOString(),
    shouldRemoveWorkflowReason: status !== 'closed',
    reason: reason ?? null,
  },
});

const getReasonBucketKey = (alert: TranslatedUpdateAlertRequest): string | undefined => {
  return alert.status === 'closed' ? alert.closingReason : undefined;
};

const createStatusAndReasonBuckets = (
  alert: TranslatedUpdateAlertRequest
): StatusAndReasonBuckets => {
  return new Map<STATUS_VALUES, Map<string | undefined, TranslatedUpdateAlertRequest[]>>([
    [alert.status, new Map([[getReasonBucketKey(alert), [alert]]])],
  ]);
};

const updateIndexEntryWithStatusAndReason = (
  statusAndReasonBuckets: StatusAndReasonBuckets,
  alert: TranslatedUpdateAlertRequest
) => {
  const reasonBucketKey = getReasonBucketKey(alert);
  const reasonToAlerts = statusAndReasonBuckets.get(alert.status);

  if (!reasonToAlerts) {
    statusAndReasonBuckets.set(alert.status, new Map([[reasonBucketKey, [alert]]]));
    return;
  }

  const alerts = reasonToAlerts.get(reasonBucketKey);
  if (!alerts) {
    reasonToAlerts.set(reasonBucketKey, [alert]);
    return;
  }

  alerts.push(alert);
};

export interface Alert {
  _id: string;
  _index: string;
  _source: Record<string, unknown>;
}

interface AlertIdIndex {
  id: string;
  index: string;
}
