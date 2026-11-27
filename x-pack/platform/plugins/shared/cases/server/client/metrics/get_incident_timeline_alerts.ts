/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqBy } from 'lodash';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { ALERT_RULE_NAME, ALERT_RULE_UUID, ALERT_SEVERITY } from '@kbn/rule-data-utils';
import { AttachmentType } from '../../../common/types/domain';
import { MAX_ALERTS_PER_CASE } from '../../../common/constants';
import type {
  IncidentTimelineAlert,
  IncidentTimelineAlertsResponse,
  DocumentResponse,
} from '../../../common/types/api';
import { IncidentTimelineAlertsResponseSchema } from '../../../common/types/api';
import { decodeOrThrowZod } from '../../common/runtime_types';
import { createCaseError } from '../../common/error';
import { filterOriginAlerts } from '../../common/utils';
import type { CasesClient } from '../client';
import type { CasesClientArgs } from '../types';
import { checkAuthorization } from './get_case_metrics';

const TIMESTAMP = '@timestamp';
const ALERT_ORIGINAL_TIME = 'kibana.alert.original_time';
const ALERT_GROUP_ID = 'kibana.alert.group.id';
const ALERT_BUILDING_BLOCK_TYPE = 'kibana.alert.building_block_type';
const HOST_NAME = 'host.name';
const USER_NAME = 'user.name';
const MAX_NAMES_PER_ALERT = 100;

export const INCIDENT_TIMELINE_ALERT_FIELDS = [
  TIMESTAMP,
  ALERT_ORIGINAL_TIME,
  ALERT_RULE_NAME,
  ALERT_RULE_UUID,
  ALERT_SEVERITY,
  HOST_NAME,
  USER_NAME,
  ALERT_GROUP_ID,
  ALERT_BUILDING_BLOCK_TYPE,
];

const firstString = (values: unknown[] | undefined): string | undefined =>
  values?.find((value): value is string => typeof value === 'string');

const allStrings = (values: unknown[] | undefined): string[] =>
  Array.from(
    new Set((values ?? []).filter((value): value is string => typeof value === 'string'))
  ).slice(0, MAX_NAMES_PER_ALERT);

/**
 * The group id of an EQL sequence shell. A shell's `original_time` is the rule run time, not an
 * event time; its building blocks carry the event times.
 */
const sequenceShellGroupId = (hit: SearchHit<unknown>): string | undefined => {
  const fields: Record<string, unknown[]> = hit.fields ?? {};
  return fields[ALERT_BUILDING_BLOCK_TYPE] === undefined
    ? firstString(fields[ALERT_GROUP_ID])
    : undefined;
};

const alertTime = (
  hit: SearchHit<unknown>,
  timestamp: string,
  sequenceStarts: ReadonlyMap<string, string>
): Pick<IncidentTimelineAlert, 'time' | 'timeSource'> => {
  const groupId = sequenceShellGroupId(hit);
  if (groupId !== undefined) {
    const start = sequenceStarts.get(groupId);
    return start
      ? { time: start, timeSource: 'sequence_start' }
      : { time: timestamp, timeSource: 'timestamp' };
  }
  const originalTime = firstString(hit.fields?.[ALERT_ORIGINAL_TIME]);
  return originalTime
    ? { time: originalTime, timeSource: 'original_time' }
    : { time: timestamp, timeSource: 'timestamp' };
};

const toIncidentTimelineAlert = (
  hit: SearchHit<unknown>,
  index: string,
  sequenceStarts: ReadonlyMap<string, string>
): IncidentTimelineAlert | undefined => {
  const fields: Record<string, unknown[]> = hit.fields ?? {};
  const timestamp = firstString(fields[TIMESTAMP]);
  if (hit._id === undefined || timestamp === undefined) {
    return undefined;
  }

  return {
    id: hit._id,
    index,
    ...alertTime(hit, timestamp, sequenceStarts),
    timestamp,
    ruleId: firstString(fields[ALERT_RULE_UUID]),
    ruleName: firstString(fields[ALERT_RULE_NAME]),
    severity: firstString(fields[ALERT_SEVERITY]),
    hostNames: allStrings(fields[HOST_NAME]),
    userNames: allStrings(fields[USER_NAME]),
  };
};

/**
 * Builds the route response from the case's attached alert documents and the search hits.
 * Alerts come back sorted by alert time. `index` is the one recorded on the case.
 */
export const buildIncidentTimelineAlertsResponse = ({
  attached,
  hits,
  sequenceStarts,
}: {
  attached: DocumentResponse;
  hits: Array<SearchHit<unknown>>;
  sequenceStarts: ReadonlyMap<string, string>;
}): IncidentTimelineAlertsResponse => {
  const uniqueAttached = uniqBy(attached, 'id');
  const originAlerts = filterOriginAlerts(uniqueAttached);
  const indexById = new Map(originAlerts.map(({ id, index }) => [id, index]));

  const alerts = uniqBy(hits, '_id')
    .flatMap((hit) => {
      const index = hit._id !== undefined ? indexById.get(hit._id) : undefined;
      const alert =
        index !== undefined ? toIncidentTimelineAlert(hit, index, sequenceStarts) : undefined;
      return alert ? [alert] : [];
    })
    .sort((a, b) => Date.parse(a.time) - Date.parse(b.time));

  return {
    alerts,
    attached: uniqueAttached.length,
    notFound: originAlerts.length - alerts.length,
    remote: uniqueAttached.length - originAlerts.length,
    atLimit: uniqueAttached.length >= MAX_ALERTS_PER_CASE,
  };
};

export const getIncidentTimelineAlerts = async (
  { caseId }: { caseId: string },
  casesClient: CasesClient,
  clientArgs: CasesClientArgs
): Promise<IncidentTimelineAlertsResponse> => {
  const {
    logger,
    services: { alertsService },
  } = clientArgs;

  try {
    await checkAuthorization(caseId, clientArgs);

    const attached = await casesClient.attachments.getAllDocumentsAttachedToCase({
      caseId,
      attachmentTypes: [AttachmentType.alert],
    });
    const originAlerts = filterOriginAlerts(attached);
    const hits =
      originAlerts.length > 0
        ? await alertsService.getAlertFields({
            alerts: originAlerts,
            fields: INCIDENT_TIMELINE_ALERT_FIELDS,
          })
        : [];

    const shellGroupIds = Array.from(
      new Set(hits.flatMap((hit) => sequenceShellGroupId(hit) ?? []))
    );
    const sequenceStarts =
      shellGroupIds.length > 0
        ? await alertsService.getSequenceStartTimes({
            alerts: originAlerts,
            groupIds: shellGroupIds,
          })
        : new Map<string, string>();

    return decodeOrThrowZod(IncidentTimelineAlertsResponseSchema)(
      buildIncidentTimelineAlertsResponse({ attached, hits, sequenceStarts })
    );
  } catch (error) {
    throw createCaseError({
      logger,
      message: `Failed to retrieve incident timeline alerts for case id: ${caseId}: ${error}`,
      error,
    });
  }
};
