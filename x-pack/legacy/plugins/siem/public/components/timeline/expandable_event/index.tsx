/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import styled from 'styled-components';

import { BrowserFields } from '../../../containers/source';
import { DetailItem } from '../../../graphql/types';
import { StatefulEventDetails } from '../../event_details/stateful_event_details';
import { LazyAccordion } from '../../lazy_accordion';
import { OnUpdateColumns } from '../events';

const ExpandableDetails = styled.div<{ hideExpandButton: boolean; width?: number }>`
  width: ${({ width }) => (width != null ? `${width}px;` : '100%')}
    ${({ hideExpandButton }) =>
      hideExpandButton
        ? `
  .euiAccordion__button svg {
    width: 0px;
    height: 0px;
  }
  `
        : ''};
`;

interface Props {
  browserFields: BrowserFields;
  id: string;
  event: DetailItem[];
  forceExpand?: boolean;
  hideExpandButton?: boolean;
  isLoading: boolean;
  onUpdateColumns: OnUpdateColumns;
  timelineId: string;
  width?: number;
}

export class ExpandableEvent extends React.PureComponent<Props> {
  public render() {
    const { forceExpand = false, id, timelineId, width } = this.props;

    return (
      <ExpandableDetails
        data-test-subj="timeline-expandable-details"
        hideExpandButton={true}
        width={width}
      >
        <LazyAccordion
          id={`timeline-${timelineId}-row-${id}`}
          renderExpandedContent={this.renderExpandedContent}
          forceExpand={forceExpand}
          paddingSize="none"
        />
      </ExpandableDetails>
    );
  }

  private renderExpandedContent = () => {
    const { browserFields, event, id, isLoading, onUpdateColumns, timelineId } = this.props;

    return (
      <StatefulEventDetails
        browserFields={browserFields}
        data={event}
        id={id}
        isLoading={isLoading}
        onUpdateColumns={onUpdateColumns}
        timelineId={timelineId}
      />
    );
  };
}
