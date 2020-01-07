/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup } from '@elastic/eui';
import { getOr, isEmpty } from 'lodash/fp';
import React from 'react';
import styled from 'styled-components';

import { BrowserFields } from '../../containers/source';
import { TimelineQuery } from '../../containers/timeline';
import { Direction } from '../../graphql/types';
import { useKibana } from '../../lib/kibana';
import { KqlMode } from '../../store/timeline/model';
import { AutoSizer } from '../auto_sizer';
import { ColumnHeader } from './body/column_headers/column_header';
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
import { esQuery, esFilters, IIndexPattern } from '../../../../../../../src/plugins/data/public';

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
  columns: ColumnHeader[];
  dataProviders: DataProvider[];
  end: number;
  filters: esFilters.Filter[];
  flyoutHeaderHeight: number;
  flyoutHeight: number;
  id: string;
  indexPattern: IIndexPattern;
  isLive: boolean;
  itemsPerPage: number;
  itemsPerPageOptions: number[];
  kqlMode: KqlMode;
  kqlQueryExpression: string;
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
  toggleColumn: (column: ColumnHeader) => void;
}

/** The parent Timeline component */
export const TimelineComponent = ({
  browserFields,
  columns,
  dataProviders,
  end,
  filters,
  flyoutHeaderHeight,
  flyoutHeight,
  id,
  indexPattern,
  isLive,
  itemsPerPage,
  itemsPerPageOptions,
  kqlMode,
  kqlQueryExpression,
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
}: Props) => {
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
    <AutoSizer detectAnyWindowResize={true} content>
      {({ measureRef, content: { height: timelineHeaderHeight = 0, width = 0 } }) => (
        <TimelineContainer
          data-test-subj="timeline"
          direction="column"
          gutterSize="none"
          justifyContent="flexStart"
        >
          <WrappedByAutoSizer ref={measureRef}>
            <TimelineHeader
              browserFields={browserFields}
              dataProviders={dataProviders}
              id={id}
              indexPattern={indexPattern}
              show={show}
              showCallOutUnauthorizedMsg={showCallOutUnauthorizedMsg}
              sort={sort}
              onChangeDataProviderKqlQuery={onChangeDataProviderKqlQuery}
              onChangeDroppableAndProvider={onChangeDroppableAndProvider}
              onDataProviderEdited={onDataProviderEdited}
              onDataProviderRemoved={onDataProviderRemoved}
              onToggleDataProviderEnabled={onToggleDataProviderEnabled}
              onToggleDataProviderExcluded={onToggleDataProviderExcluded}
            />
          </WrappedByAutoSizer>
          <TimelineKqlFetch id={id} indexPattern={indexPattern} inputId="timeline" />
          {combinedQueries != null ? (
            <TimelineQuery
              fields={columnsHeader.map(c => c.id)}
              filterQuery={combinedQueries.filterQuery}
              id={id}
              limit={itemsPerPage}
              sortField={{
                sortFieldId: sort.columnId,
                direction: sort.sortDirection as Direction,
              }}
              sourceId="default"
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
                <ManageTimelineContext loading={loading} width={width}>
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
                    height={calculateBodyHeight({
                      flyoutHeight,
                      flyoutHeaderHeight,
                      timelineHeaderHeight,
                      timelineFooterHeight: footerHeight,
                    })}
                    id={id}
                    sort={sort}
                    toggleColumn={toggleColumn}
                  />
                  <Footer
                    compact={isCompactFooter(width)}
                    getUpdatedAt={getUpdatedAt}
                    hasNextPage={getOr(false, 'hasNextPage', pageInfo)!}
                    height={footerHeight}
                    isLive={isLive}
                    isLoading={loading}
                    itemsCount={events.length}
                    itemsPerPage={itemsPerPage}
                    itemsPerPageOptions={itemsPerPageOptions}
                    nextCursor={getOr(null, 'endCursor.value', pageInfo)!}
                    serverSideEventCount={totalCount}
                    tieBreaker={getOr(null, 'endCursor.tiebreaker', pageInfo)}
                    onChangeItemsPerPage={onChangeItemsPerPage}
                    onLoadMore={loadMore}
                  />
                </ManageTimelineContext>
              )}
            </TimelineQuery>
          ) : null}
        </TimelineContainer>
      )}
    </AutoSizer>
  );
};

TimelineComponent.displayName = 'TimelineComponent';

export const Timeline = React.memo(TimelineComponent);

Timeline.displayName = 'Timeline';
