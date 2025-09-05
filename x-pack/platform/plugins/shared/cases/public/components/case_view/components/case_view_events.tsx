/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { type CaseUI } from '../../../../common';
import { CASE_VIEW_PAGE_TABS } from '../../../../common/types';
import { CaseViewTabs } from '../case_view_tabs';
import { EventsTable } from '../../events/events_table';

interface CaseViewEventsProps {
  caseData: CaseUI;
}

export const CaseViewEvents = ({ caseData }: CaseViewAlertsProps) => {
  return (
    <EuiFlexItem data-test-subj="case-view-events">
      <CaseViewTabs caseData={caseData} activeTab={CASE_VIEW_PAGE_TABS.EVENTS} />
      <EventsTable caseData={caseData} />
    </EuiFlexItem>
  );
};
CaseViewEvents.displayName = 'CaseViewEvents';
