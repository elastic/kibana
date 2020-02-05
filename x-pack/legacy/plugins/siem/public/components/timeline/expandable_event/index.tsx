/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';

import { BrowserFields } from '../../../containers/source';
import { ColumnHeader } from '../body/column_headers/column_header';
import { DetailItem } from '../../../graphql/types';
import { StatefulEventDetails } from '../../event_details/stateful_event_details';
import { LazyAccordion } from '../../lazy_accordion';
import { OnUpdateColumns } from '../events';
import { useTimelineWidthContext } from '../timeline_context';

const ExpandableDetails = styled.div<{ hideExpandButton: boolean }>`
  ${({ hideExpandButton }) =>
    hideExpandButton
      ? `
  .euiAccordion__button {
    display: none;
  }
  `
      : ''};
`;

ExpandableDetails.displayName = 'ExpandableDetails';

interface Props {
  browserFields: BrowserFields;
  columnHeaders: ColumnHeader[];
  id: string;
  event: DetailItem[];
  forceExpand?: boolean;
  hideExpandButton?: boolean;
  onUpdateColumns: OnUpdateColumns;
  timelineId: string;
  toggleColumn: (column: ColumnHeader) => void;
}

export const ExpandableEvent = React.memo<Props>(
  ({
    browserFields,
    columnHeaders,
    event,
    forceExpand = false,
    id,
    timelineId,
    toggleColumn,
    onUpdateColumns,
  }) => {
    const width = useTimelineWidthContext();
    // Passing the styles directly to the component of LazyAccordion because the width is
    // being calculated and is recommended by Styled Components for performance
    // https://github.com/styled-components/styled-components/issues/134#issuecomment-312415291
    return (
      <ExpandableDetails hideExpandButton={true}>
        <LazyAccordion
          style={{ width: `${width}px` }}
          id={`timeline-${timelineId}-row-${id}`}
          renderExpandedContent={() => (
            <StatefulEventDetails
              browserFields={browserFields}
              columnHeaders={columnHeaders}
              data={event}
              id={id}
              onUpdateColumns={onUpdateColumns}
              timelineId={timelineId}
              toggleColumn={toggleColumn}
            />
          )}
          forceExpand={forceExpand}
          paddingSize="none"
        />
      </ExpandableDetails>
    );
  }
);

ExpandableEvent.displayName = 'ExpandableEvent';
