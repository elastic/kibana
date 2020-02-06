/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiToolTip } from '@elastic/eui';
import { noop } from 'lodash/fp';
import React from 'react';

import { TruncatableText } from '../../../../truncatable_text';
import { EventsHeading, EventsHeadingTitleButton, EventsHeadingTitleSpan } from '../../../styles';
import { useTimelineContext } from '../../../timeline_context';
import { Sort } from '../../sort';
import { SortIndicator } from '../../sort/sort_indicator';
import { ColumnHeader } from '../column_header';
import { HeaderToolTipContent } from '../header_tooltip_content';
import { getSortDirection } from './helpers';

interface HeaderContentProps {
  children: React.ReactNode;
  header: ColumnHeader;
  isResizing: boolean;
  onClick: () => void;
  sort: Sort;
}

const HeaderContentComponent: React.FC<HeaderContentProps> = ({
  children,
  header,
  isResizing,
  onClick,
  sort,
}) => {
  const isLoading = useTimelineContext();

  return (
    <EventsHeading data-test-subj="header" isLoading={isLoading}>
      {header.aggregatable ? (
        <EventsHeadingTitleButton
          data-test-subj="header-sort-button"
          onClick={!isResizing && !isLoading ? onClick : noop}
        >
          <TruncatableText data-test-subj={`header-text-${header.id}`}>
            <EuiToolTip
              data-test-subj="header-tooltip"
              content={<HeaderToolTipContent header={header} />}
            >
              <>{header.label ?? header.id}</>
            </EuiToolTip>
          </TruncatableText>

          <SortIndicator
            data-test-subj="header-sort-indicator"
            sortDirection={getSortDirection({ header, sort })}
          />
        </EventsHeadingTitleButton>
      ) : (
        <EventsHeadingTitleSpan>
          <TruncatableText data-test-subj={`header-text-${header.id}`}>
            <EuiToolTip
              data-test-subj="header-tooltip"
              content={<HeaderToolTipContent header={header} />}
            >
              <>{header.label ?? header.id}</>
            </EuiToolTip>
          </TruncatableText>
        </EventsHeadingTitleSpan>
      )}

      {children}
    </EventsHeading>
  );
};

export const HeaderContent = React.memo(HeaderContentComponent);
