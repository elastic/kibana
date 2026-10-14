/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Alert } from '@kbn/alerts-as-data-utils';
import {
  ALERT_INSTANCE_ID,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  ALERT_STATUS_UNTRACKED,
  ALERT_STATUS_DELAYED,
  ALERT_TRACKED,
  ALERT_UUID,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import { get } from 'lodash';
import type { RawAlertInstance, RuleAlertData } from '../../types';
import type { TrackedAADAlerts, SearchResult } from '../types';

// Tracked docs cannot exceed ~2x maxAlerts; 10k is the ES default window and a safe cap.
const TRACKED_ALERTS_FETCH_SIZE = 10000;

export type TrackedAlertsSearch<AlertData extends RuleAlertData> = (
  queryBody: Record<string, unknown>
) => Promise<SearchResult<AlertData>>;

export function createEmptyTrackedAlerts<
  AlertData extends RuleAlertData
>(): TrackedAADAlerts<AlertData> {
  return {
    indices: {},
    active: {},
    recovered: {},
    delayed: {},
    all: {},
    seqNo: {},
    primaryTerm: {},
    instanceIdIndex: { active: {}, recovered: {}, delayed: {} },
    get(uuid: string) {
      return this.all[uuid];
    },
    getById(id: string) {
      const uuid =
        this.instanceIdIndex.active[id] ??
        this.instanceIdIndex.recovered[id] ??
        this.instanceIdIndex.delayed[id];
      return uuid ? this.all[uuid] : undefined;
    },
  };
}

export async function fetchTrackedAlerts<AlertData extends RuleAlertData>({
  ruleId,
  search,
}: {
  ruleId: string;
  search: TrackedAlertsSearch<AlertData>;
}): Promise<SearchResult<AlertData>['hits']> {
  const alerts = await search({
    size: TRACKED_ALERTS_FETCH_SIZE,
    seq_no_primary_term: true,
    query: {
      bool: {
        must: [{ term: { [ALERT_RULE_UUID]: ruleId } }, { term: { [ALERT_TRACKED]: true } }],
        must_not: [{ term: { [ALERT_STATUS]: ALERT_STATUS_UNTRACKED } }],
      },
    },
  });

  return alerts.hits;
}

export async function fetchAlertsByIds<AlertData extends RuleAlertData>({
  ruleId,
  alertUuids,
  search,
}: {
  ruleId: string;
  alertUuids: string[];
  search: TrackedAlertsSearch<AlertData>;
}): Promise<SearchResult<AlertData>['hits']> {
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
    const instanceId = get(alertHit, ALERT_INSTANCE_ID);
    const status = get(alertHit, ALERT_STATUS);

    trackedAlerts.all[alertUuid] = alertHit;
    trackedAlerts.indices[alertUuid] = hit._index;
    trackedAlerts.seqNo[alertUuid] = hit._seq_no;
    trackedAlerts.primaryTerm[alertUuid] = hit._primary_term;

    const bucket = getStatusBucket(trackedAlerts, status);
    if (!bucket) {
      continue;
    }
    bucket.alerts[alertUuid] = alertHit;
    indexByInstanceId(bucket.index, instanceId, alertUuid, alertHit, trackedAlerts.all);
  }
}

function getStatusBucket<AlertData extends RuleAlertData>(
  trackedAlerts: TrackedAADAlerts<AlertData>,
  status: string | undefined
): { alerts: Record<string, Alert & AlertData>; index: Record<string, string> } | undefined {
  switch (status) {
    case ALERT_STATUS_ACTIVE:
      return { alerts: trackedAlerts.active, index: trackedAlerts.instanceIdIndex.active };
    case ALERT_STATUS_RECOVERED:
      return { alerts: trackedAlerts.recovered, index: trackedAlerts.instanceIdIndex.recovered };
    case ALERT_STATUS_DELAYED:
      return { alerts: trackedAlerts.delayed, index: trackedAlerts.instanceIdIndex.delayed };
    default:
      return undefined;
  }
}

// Keeps one uuid per instance id within a status bucket. When two documents share an
// instance id, the one that started most recently wins; ties keep the first one seen.
function indexByInstanceId<AlertData extends RuleAlertData>(
  index: Record<string, string>,
  instanceId: string | undefined,
  alertUuid: string | undefined,
  alertHit: Alert & AlertData,
  allAlerts: Record<string, Alert & AlertData>
): void {
  if (!instanceId || !alertUuid) {
    return;
  }
  const existingUuid = index[instanceId];
  if (!existingUuid) {
    index[instanceId] = alertUuid;
    return;
  }
  if (getAlertStartTime(alertHit) > getAlertStartTime(allAlerts[existingUuid])) {
    index[instanceId] = alertUuid;
  }
}

function getAlertStartTime(alert: Alert | undefined): number {
  const start = get(alert, ALERT_START) ?? get(alert, TIMESTAMP);
  const time = start ? new Date(start).getTime() : NaN;
  return Number.isNaN(time) ? 0 : time;
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
