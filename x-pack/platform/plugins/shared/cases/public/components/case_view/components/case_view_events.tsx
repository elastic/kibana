/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem } from '@elastic/eui';
import React, { useMemo } from 'react';
import { type CaseUI } from '../../../../common';
import { CASE_VIEW_PAGE_TABS } from '../../../../common/types';
import { CaseViewTabs } from '../case_view_tabs';
import type { CaseViewProps } from '../types';

import { AttachmentType, type EventAttachment } from '../../../../common/types/domain';

interface CaseViewEventsProps {
  caseData: CaseUI;
  renderEventsTable: CaseViewProps['renderEventsTable'];
}

export const CaseViewEvents = ({
  caseData,
  renderEventsTable: EventsTable,
}: CaseViewEventsProps) => {
  const events = useMemo(
    () =>
      caseData.comments
        .filter((comment) => comment.type === AttachmentType.event)
        .map((attachment) => {
          const eventAttachment = attachment as unknown as EventAttachment;

          return {
            eventId: eventAttachment.id,
            index: eventAttachment.index,
          };
        }),
    [caseData.comments]
  );

  // TODO: skip entire tab if events table is not there
  if (!EventsTable) {
    return null;
  }

  return (
    <EuiFlexItem data-test-subj="case-view-events">
      <CaseViewTabs caseData={caseData} activeTab={CASE_VIEW_PAGE_TABS.EVENTS} />
      <EventsTable events={events} />
    </EuiFlexItem>
  );
};
CaseViewEvents.displayName = 'CaseViewEvents';
