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
  ALERT_STATUS_DELAYED,
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

  // The execution-uuid collapse above only reaches back `lookBackWindow` executions, so a
  // document that stops being updated (e.g. task state was rewound by an error, see
  // get_state.ts) ages out of it and becomes invisible forever. Fetch active/delayed
  // documents for this rule directly so a stuck document can always be seen and, if it is
  // an orphan, reconciled below.
  const activeAndDelayedHits = await fetchActiveAndDelayedAlerts({
    ruleId,
    maxAlertLimit,
    search,
  });

  populateTrackedAlerts(trackedAlerts, activeAndDelayedHits);

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

  const orphanedAlertUuids = reconcileOrphanedAlerts(trackedAlerts, alertUuidsFromState);

  if (orphanedAlertUuids.length > 0) {
    logger.warn(
      `Found ${
        orphanedAlertUuids.length
      } active or delayed alert documents ${ruleInfoMessage} whose uuid is not tracked in task state - treating as orphaned and untracking: ${orphanedAlertUuids.join(
        ', '
      )}`,
      logTags
    );
  }

  trackedAlerts.orphanedAlertUuids = orphanedAlertUuids;

  return trackedAlerts;
}

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
    orphanedAlertUuids: [],
    get(uuid: string) {
      return this.all[uuid];
    },
    getById(id: string) {
      return (
        Object.values(this.active).find((alert) => get(alert, ALERT_INSTANCE_ID) === id) ??
        Object.values(this.recovered).find((alert) => get(alert, ALERT_INSTANCE_ID) === id) ??
        Object.values(this.delayed).find((alert) => get(alert, ALERT_INSTANCE_ID) === id)
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

async function fetchActiveAndDelayedAlerts<AlertData extends RuleAlertData>({
  ruleId,
  maxAlertLimit,
  search,
}: {
  ruleId: string;
  maxAlertLimit: number;
  search: (queryBody: Record<string, unknown>) => Promise<SearchResult<AlertData>>;
}) {
  const result = await search({
    size: maxAlertLimit * 2,
    seq_no_primary_term: true,
    query: {
      bool: {
        must: [
          { term: { [ALERT_RULE_UUID]: ruleId } },
          { terms: { [ALERT_STATUS]: [ALERT_STATUS_ACTIVE, ALERT_STATUS_DELAYED] } },
        ],
      },
    },
  });

  return result.hits;
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
    if (status === ALERT_STATUS_DELAYED) {
      trackedAlerts.delayed[alertUuid] = alertHit;
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

// A document claiming active/delayed for this rule is only legitimate if the framework is
// currently tracking its uuid. Anything else is an orphan left behind by a prior divergence
// between AAD and task state (see get_state.ts returning stale state on error, or a rule
// disable/enable cycle). Strip orphans out so getById/buildActiveAlerts never target them,
// and return their uuids so the caller can drive them to `untracked`.
export function reconcileOrphanedAlerts<AlertData extends RuleAlertData>(
  trackedAlerts: TrackedAADAlerts<AlertData>,
  alertUuidsFromState: string[]
): string[] {
  const trackedUuids = new Set(alertUuidsFromState);
  const orphanedAlertUuids = [
    ...Object.keys(trackedAlerts.active),
    ...Object.keys(trackedAlerts.delayed),
  ].filter((uuid) => !trackedUuids.has(uuid));

  for (const uuid of orphanedAlertUuids) {
    delete trackedAlerts.active[uuid];
    delete trackedAlerts.delayed[uuid];
    delete trackedAlerts.all[uuid];
    delete trackedAlerts.indices[uuid];
    delete trackedAlerts.seqNo[uuid];
    delete trackedAlerts.primaryTerm[uuid];
  }

  return orphanedAlertUuids;
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
