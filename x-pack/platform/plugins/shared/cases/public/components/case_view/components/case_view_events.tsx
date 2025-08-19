/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useMemo } from 'react';
import { AttachmentType, type CaseUI } from '../../../../common';
import { CASE_VIEW_PAGE_TABS } from '../../../../common/types';
import { CaseViewTabs } from '../case_view_tabs';
import { CaseViewAlertsEmpty } from './case_view_alerts_empty';
import { EventsTable } from '../../events/events_table';

interface CaseViewAlertsProps {
  caseData: CaseUI;
}

export const CaseViewEvents = ({ caseData }: CaseViewAlertsProps) => {
  const eventIds = caseData.comments
    .filter((comment) => comment.type === AttachmentType.event)
    .flatMap((comment) => comment.eventId);
  const eventIdsQuery = useMemo(
    () => ({
      ids: {
        values: eventIds,
      },
    }),
    [eventIds]
  );

  if (eventIdsQuery.ids.values.length === 0) {
    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          <CaseViewTabs caseData={caseData} activeTab={CASE_VIEW_PAGE_TABS.EVENTS} />
          <CaseViewAlertsEmpty />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexItem data-test-subj="case-view-alerts">
      <CaseViewTabs caseData={caseData} activeTab={CASE_VIEW_PAGE_TABS.EVENTS} />
      <EventsTable caseData={caseData} isLoading={false} />
    </EuiFlexItem>
  );
};
CaseViewEvents.displayName = 'CaseViewEvents';
