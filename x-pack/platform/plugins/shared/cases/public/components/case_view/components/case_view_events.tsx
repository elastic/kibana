/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';

import { type CaseUI } from '../../../../common';
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
            eventId: eventAttachment.eventId,
            index: eventAttachment.index,
          };
        }),
    [caseData.comments]
  );

  if (!EventsTable) {
    throw new Error('renderEventsTable has not been specified during case plugin init');
  }

  return (
    <EuiFlexItem
      css={css`
        width: 100%;
      `}
      data-test-subj="case-view-events"
    >
      <EventsTable events={events} />
    </EuiFlexItem>
  );
};
CaseViewEvents.displayName = 'CaseViewEvents';
