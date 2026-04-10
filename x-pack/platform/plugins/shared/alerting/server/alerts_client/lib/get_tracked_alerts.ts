/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { Alert } from '@kbn/alerts-as-data-utils';
import {
  ALERT_INSTANCE_ID,
  ALERT_RULE_UUID,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  ALERT_STATUS_UNTRACKED,
  ALERT_UUID,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import { get } from 'lodash';
import type { RawAlertInstance, RuleAlertData } from '../../types';
import type { TrackedAADAlerts, SearchResult } from '../types';

export interface GetTrackedAlertsParams<AlertData extends RuleAlertData> {
  ruleId: string;
  lookBackWindow: number;
  maxAlertLimit: number;
  activeAlertsFromState: Record<string, RawAlertInstance>;
  recoveredAlertsFromState: Record<string, RawAlertInstance>;
  search: (queryBody: Record<string, unknown>) => Promise<SearchResult<AlertData>>;
  logger: Logger;
  ruleInfoMessage: string;
  logTags: { tags: string[] };
}

export async function getTrackedAlerts<AlertData extends RuleAlertData>({
  ruleId,
  lookBackWindow,
  maxAlertLimit,
  activeAlertsFromState,
  recoveredAlertsFromState,
  search,
  logger,
  ruleInfoMessage,
  logTags,
}: GetTrackedAlertsParams<AlertData>): Promise<TrackedAADAlerts<AlertData>> {
  const trackedAlerts = createEmptyTrackedAlerts<AlertData>();

  const hits = await fetchTrackedAlertsByExecution({
    ruleId,
    lookBackWindow,
    maxAlertLimit,
    search,
  });

  populateTrackedAlerts(trackedAlerts, hits);

  const alertUuidsFromState = getAlertUuidsFromState(
    activeAlertsFromState,
    recoveredAlertsFromState
  );
  const missingUuids = findMissingAlertUuids(alertUuidsFromState, trackedAlerts);

  if (missingUuids.length > 0) {
    logger.warn(
      `Found ${missingUuids.length} alerts in task state not returned by tracked alerts query ${ruleInfoMessage}. Fetching them directly to restore tracking info.`,
      logTags
    );
    try {
      const missingHits = await fetchAlertsByIds({
        ruleId,
        alertUuids: missingUuids,
        search,
      });

      populateTrackedAlerts(trackedAlerts, missingHits);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error(`Error fetching missing tracked alerts ${ruleInfoMessage} - ${errorMessage}`, {
        tags: logTags.tags,
        error: { stack_trace: err.stack },
      });
    }
  }

  return trackedAlerts;
}

export function createEmptyTrackedAlerts<
  AlertData extends RuleAlertData
>(): TrackedAADAlerts<AlertData> {
  return {
    indices: {},
    active: {},
    recovered: {},
    all: {},
    seqNo: {},
    primaryTerm: {},
    get(uuid: string) {
      return this.all[uuid];
    },
    getById(id: string) {
      return (
        Object.values(this.active).find((alert) => get(alert, ALERT_INSTANCE_ID) === id) ??
        Object.values(this.recovered).find((alert) => get(alert, ALERT_INSTANCE_ID) === id)
      );
    },
  };
}

async function fetchTrackedAlertsByExecution<AlertData extends RuleAlertData>({
  ruleId,
  lookBackWindow,
  maxAlertLimit,
  search,
}: {
  ruleId: string;
  lookBackWindow: number;
  maxAlertLimit: number;
  search: (queryBody: Record<string, unknown>) => Promise<SearchResult<AlertData>>;
}) {
  const executions = await search({
    size: lookBackWindow,
    query: {
      bool: {
        must: [{ term: { [ALERT_RULE_UUID]: ruleId } }],
      },
    },
    collapse: {
      field: ALERT_RULE_EXECUTION_UUID,
    },
    _source: false,
    sort: [{ [TIMESTAMP]: { order: 'desc' } }],
  });

  const executionUuids = (executions.hits || [])
    .map((hit) => get(hit.fields, ALERT_RULE_EXECUTION_UUID))
    .flat()
    .filter((uuid): uuid is string => uuid !== null);

  if (executionUuids.length === 0) {
    return [];
  }

  const alerts = await search({
    size: maxAlertLimit * 2,
    seq_no_primary_term: true,
    query: {
      bool: {
        must: [{ term: { [ALERT_RULE_UUID]: ruleId } }],
        must_not: [{ term: { [ALERT_STATUS]: ALERT_STATUS_UNTRACKED } }],
        filter: [{ terms: { [ALERT_RULE_EXECUTION_UUID]: executionUuids } }],
      },
    },
  });

  return alerts.hits;
}

async function fetchAlertsByIds<AlertData extends RuleAlertData>({
  ruleId,
  alertUuids,
  search,
}: {
  ruleId: string;
  alertUuids: string[];
  search: (queryBody: Record<string, unknown>) => Promise<SearchResult<AlertData>>;
}) {
  const result = await search({
    size: alertUuids.length,
    seq_no_primary_term: true,
    query: {
      bool: {
        must: [{ term: { [ALERT_RULE_UUID]: ruleId } }],
        must_not: [{ term: { [ALERT_STATUS]: ALERT_STATUS_UNTRACKED } }],
        filter: [{ ids: { values: alertUuids } }],
      },
    },
  });

  return result.hits;
}

export function populateTrackedAlerts<AlertData extends RuleAlertData>(
  trackedAlerts: TrackedAADAlerts<AlertData>,
  hits: SearchResult<AlertData>['hits']
): void {
  for (const hit of hits) {
    const alertHit = hit._source as Alert & AlertData;
    const alertUuid = get(alertHit, ALERT_UUID);

    trackedAlerts.all[alertUuid] = alertHit;

    const status = get(alertHit, ALERT_STATUS);
    if (status === ALERT_STATUS_ACTIVE) {
      trackedAlerts.active[alertUuid] = alertHit;
    }
    if (status === ALERT_STATUS_RECOVERED) {
      trackedAlerts.recovered[alertUuid] = alertHit;
    }
    trackedAlerts.indices[alertUuid] = hit._index;
    trackedAlerts.seqNo[alertUuid] = hit._seq_no;
    trackedAlerts.primaryTerm[alertUuid] = hit._primary_term;
  }
}

export function findMissingAlertUuids<AlertData extends RuleAlertData>(
  alertUuidsFromState: string[],
  trackedAlerts: TrackedAADAlerts<AlertData>
): string[] {
  return alertUuidsFromState.filter((uuid) => !trackedAlerts.all[uuid]);
}

export function getAlertUuidsFromState(
  activeAlertsFromState: Record<string, RawAlertInstance>,
  recoveredAlertsFromState: Record<string, RawAlertInstance>
): string[] {
  const uuids: string[] = [];
  for (const raw of Object.values(activeAlertsFromState)) {
    if (raw.meta?.uuid) {
      uuids.push(raw.meta.uuid);
    }
  }
  for (const raw of Object.values(recoveredAlertsFromState)) {
    if (raw.meta?.uuid) {
      uuids.push(raw.meta.uuid);
    }
  }
  return uuids;
}
