/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import styled from 'styled-components';

import { BrowserFields } from '../../../containers/source';
import { ColumnHeader } from '../body/column_headers/column_header';
import { DetailItem } from '../../../graphql/types';
import { StatefulEventDetails } from '../../event_details/stateful_event_details';
import { LazyAccordion } from '../../lazy_accordion';
import { OnUpdateColumns } from '../events';

const ExpandableDetails = styled.div<{ hideExpandButton: boolean; width?: number }>`
  width: ${({ width }) => (width != null ? `${width}px;` : '100%')}
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
  isLoading: boolean;
  onUpdateColumns: OnUpdateColumns;
  timelineId: string;
  toggleColumn: (column: ColumnHeader) => void;
  width?: number;
}

export class ExpandableEvent extends React.PureComponent<Props> {
  public render() {
    const {
      browserFields,
      columnHeaders,
      event,
      forceExpand = false,
      id,
      isLoading,
      timelineId,
      toggleColumn,
      onUpdateColumns,
      width,
    } = this.props;

    return (
      <ExpandableDetails
        data-test-subj="timeline-expandable-details"
        hideExpandButton={true}
        width={width}
      >
        <LazyAccordion
          id={`timeline-${timelineId}-row-${id}`}
          renderExpandedContent={() => (
            <StatefulEventDetails
              browserFields={browserFields}
              columnHeaders={columnHeaders}
              data={event}
              id={id}
              isLoading={isLoading}
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
}
