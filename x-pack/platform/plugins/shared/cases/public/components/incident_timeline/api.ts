/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_INCIDENT_TIMELINE_ALERTS_URL } from '../../../common/constants';
import { INCIDENT_TIMELINE_ENTRY_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import { getCaseAttachmentDetailsUrl } from '../../../common/api';
import type { IncidentTimelineAlertsResponse } from '../../../common/types/api';
import { IncidentTimelineAlertsResponseSchema } from '../../../common/types/api';
import type { IncidentTimelineEntryData } from '../../../common/types/domain/attachment/incident_timeline_entry/v2';
import { KibanaServices } from '../../common/lib/kibana';

export const getIncidentTimelineAlerts = async (
  caseId: string,
  signal?: AbortSignal
): Promise<IncidentTimelineAlertsResponse> => {
  const response = await KibanaServices.get().http.fetch<unknown>(
    INTERNAL_INCIDENT_TIMELINE_ALERTS_URL.replace('{case_id}', caseId),
    { method: 'GET', signal }
  );
  return IncidentTimelineAlertsResponseSchema.parse(response);
};

export const updateIncidentTimelineEntry = async ({
  caseId,
  entryId,
  version,
  owner,
  data,
}: {
  caseId: string;
  entryId: string;
  version: string;
  owner: string;
  data: IncidentTimelineEntryData;
}): Promise<void> => {
  await KibanaServices.get().http.fetch(getCaseAttachmentDetailsUrl(caseId, entryId), {
    method: 'PUT',
    body: JSON.stringify({ type: INCIDENT_TIMELINE_ENTRY_ATTACHMENT_TYPE, data, owner, version }),
  });
};
