/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup } from '@elastic/eui';
import { getOr, isEmpty } from 'lodash/fp';
import React from 'react';
import styled from 'styled-components';
import useResizeObserver from 'use-resize-observer';

import { BrowserFields } from '../../containers/source';
import { TimelineQuery } from '../../containers/timeline';
import { Direction } from '../../graphql/types';
import { useKibana } from '../../lib/kibana';
import { ColumnHeaderOptions, KqlMode, EventType } from '../../store/timeline/model';
import { defaultHeaders } from './body/column_headers/default_headers';
import { Sort } from './body/sort';
import { StatefulBody } from './body/stateful_body';
import { DataProvider } from './data_providers/data_provider';
import {
  OnChangeDataProviderKqlQuery,
  OnChangeDroppableAndProvider,
  OnChangeItemsPerPage,
  OnDataProviderRemoved,
  OnDataProviderEdited,
  OnToggleDataProviderEnabled,
  OnToggleDataProviderExcluded,
} from './events';
import { TimelineKqlFetch } from './fetch_kql_timeline';
import { Footer, footerHeight } from './footer';
import { TimelineHeader } from './header';
import { calculateBodyHeight, combineQueries } from './helpers';
import { TimelineRefetch } from './refetch_timeline';
import { ManageTimelineContext } from './timeline_context';
import { esQuery, Filter, IIndexPattern } from '../../../../../../../src/plugins/data/public';

const WrappedByAutoSizer = styled.div`
  width: 100%;
`; // required by AutoSizer

WrappedByAutoSizer.displayName = 'WrappedByAutoSizer';

const TimelineContainer = styled(EuiFlexGroup)`
  min-height: 500px;
  overflow: hidden;
  padding: 0 10px 0 12px;
  user-select: none;
  width: 100%;
`;

TimelineContainer.displayName = 'TimelineContainer';

export const isCompactFooter = (width: number): boolean => width < 600;

interface Props {
  browserFields: BrowserFields;
  columns: ColumnHeaderOptions[];
  dataProviders: DataProvider[];
  end: number;
  eventType?: EventType;
  filters: Filter[];
  flyoutHeaderHeight: number;
  flyoutHeight: number;
  id: string;
  indexPattern: IIndexPattern;
  indexToAdd: string[];
  isLive: boolean;
  itemsPerPage: number;
  itemsPerPageOptions: number[];
  kqlMode: KqlMode;
  kqlQueryExpression: string;
  loadingIndexName: boolean;
  onChangeDataProviderKqlQuery: OnChangeDataProviderKqlQuery;
  onChangeDroppableAndProvider: OnChangeDroppableAndProvider;
  onChangeItemsPerPage: OnChangeItemsPerPage;
  onDataProviderEdited: OnDataProviderEdited;
  onDataProviderRemoved: OnDataProviderRemoved;
  onToggleDataProviderEnabled: OnToggleDataProviderEnabled;
  onToggleDataProviderExcluded: OnToggleDataProviderExcluded;
  show: boolean;
  showCallOutUnauthorizedMsg: boolean;
  start: number;
  sort: Sort;
  toggleColumn: (column: ColumnHeaderOptions) => void;
}

/** The parent Timeline component */
export const TimelineComponent: React.FC<Props> = ({
  browserFields,
  columns,
  dataProviders,
  end,
  eventType,
  filters,
  flyoutHeaderHeight,
  flyoutHeight,
  id,
  indexPattern,
  indexToAdd,
  isLive,
  itemsPerPage,
  itemsPerPageOptions,
  kqlMode,
  kqlQueryExpression,
  loadingIndexName,
  onChangeDataProviderKqlQuery,
  onChangeDroppableAndProvider,
  onChangeItemsPerPage,
  onDataProviderEdited,
  onDataProviderRemoved,
  onToggleDataProviderEnabled,
  onToggleDataProviderExcluded,
  show,
  showCallOutUnauthorizedMsg,
  start,
  sort,
  toggleColumn,
}) => {
  const { ref: measureRef, width = 0, height: timelineHeaderHeight = 0 } = useResizeObserver<
    HTMLDivElement
  >({});
  const kibana = useKibana();
  const combinedQueries = combineQueries({
    config: esQuery.getEsQueryConfig(kibana.services.uiSettings),
    dataProviders,
    indexPattern,
    browserFields,
    filters,
    kqlQuery: { query: kqlQueryExpression, language: 'kuery' },
    kqlMode,
    start,
    end,
  });
  const columnsHeader = isEmpty(columns) ? defaultHeaders : columns;

  return (
    <TimelineContainer
      data-test-subj="timeline"
      direction="column"
      gutterSize="none"
      justifyContent="flexStart"
    >
      <WrappedByAutoSizer ref={measureRef as React.RefObject<HTMLDivElement>}>
        <TimelineHeader
          browserFields={browserFields}
          id={id}
          indexPattern={indexPattern}
          dataProviders={dataProviders}
          onChangeDataProviderKqlQuery={onChangeDataProviderKqlQuery}
          onChangeDroppableAndProvider={onChangeDroppableAndProvider}
          onDataProviderEdited={onDataProviderEdited}
          onDataProviderRemoved={onDataProviderRemoved}
          onToggleDataProviderEnabled={onToggleDataProviderEnabled}
          onToggleDataProviderExcluded={onToggleDataProviderExcluded}
          show={show}
          showCallOutUnauthorizedMsg={showCallOutUnauthorizedMsg}
          sort={sort}
        />
      </WrappedByAutoSizer>
      <TimelineKqlFetch id={id} indexPattern={indexPattern} inputId="timeline" />
      {combinedQueries != null ? (
        <TimelineQuery
          eventType={eventType}
          id={id}
          indexToAdd={indexToAdd}
          fields={columnsHeader.map(c => c.id)}
          sourceId="default"
          limit={itemsPerPage}
          filterQuery={combinedQueries.filterQuery}
          sortField={{
            sortFieldId: sort.columnId,
            direction: sort.sortDirection as Direction,
          }}
        >
          {({
            events,
            inspect,
            loading,
            totalCount,
            pageInfo,
            loadMore,
            getUpdatedAt,
            refetch,
          }) => (
            <ManageTimelineContext loading={loading || loadingIndexName} width={width}>
              <TimelineRefetch
                id={id}
                inputId="timeline"
                inspect={inspect}
                loading={loading}
                refetch={refetch}
              />
              <StatefulBody
                browserFields={browserFields}
                data={events}
                id={id}
                height={calculateBodyHeight({
                  flyoutHeight,
                  flyoutHeaderHeight,
                  timelineHeaderHeight,
                  timelineFooterHeight: footerHeight,
                })}
                sort={sort}
                toggleColumn={toggleColumn}
              />
              <Footer
                serverSideEventCount={totalCount}
                hasNextPage={getOr(false, 'hasNextPage', pageInfo)!}
                height={footerHeight}
                isLive={isLive}
                isLoading={loading || loadingIndexName}
                itemsCount={events.length}
                itemsPerPage={itemsPerPage}
                itemsPerPageOptions={itemsPerPageOptions}
                onChangeItemsPerPage={onChangeItemsPerPage}
                onLoadMore={loadMore}
                nextCursor={getOr(null, 'endCursor.value', pageInfo)!}
                tieBreaker={getOr(null, 'endCursor.tiebreaker', pageInfo)}
                getUpdatedAt={getUpdatedAt}
                compact={isCompactFooter(width)}
              />
            </ManageTimelineContext>
          )}
        </TimelineQuery>
      ) : null}
    </TimelineContainer>
  );
};

TimelineComponent.displayName = 'TimelineComponent';

export const Timeline = React.memo(TimelineComponent);

Timeline.displayName = 'Timeline';
