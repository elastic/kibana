/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { BrowserFields } from '../../../../containers/source';
import { Ecs } from '../../../../graphql/types';
import { EventsTrSupplement, OFFSET_SCROLLBAR } from '../../styles';
import { useTimelineWidthContext } from '../../timeline_context';

interface RowRendererContainerProps {
  children: React.ReactNode;
}

export const RowRendererContainer = React.memo<RowRendererContainerProps>(({ children }) => {
  const width = useTimelineWidthContext();

  // Passing the styles directly to the component because the width is
  // being calculated and is recommended by Styled Components for performance
  // https://github.com/styled-components/styled-components/issues/134#issuecomment-312415291
  return (
    <EventsTrSupplement
      className="siemEventsTable__trSupplement--summary"
      style={{ width: `${width - OFFSET_SCROLLBAR}px` }}
    >
      {children}
    </EventsTrSupplement>
  );
});
RowRendererContainer.displayName = 'RowRendererContainer';

export interface RowRenderer {
  isInstance: (data: Ecs) => boolean;
  renderRow: ({
    browserFields,
    data,
    children,
    timelineId,
  }: {
    browserFields: BrowserFields;
    data: Ecs;
    children: React.ReactNode;
    timelineId: string;
  }) => React.ReactNode;
}
