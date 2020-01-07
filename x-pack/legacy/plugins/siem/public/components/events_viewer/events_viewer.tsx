/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel } from '@elastic/eui';
import { getOr, isEmpty, isEqual, union } from 'lodash/fp';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import { BrowserFields } from '../../containers/source';
import { TimelineQuery } from '../../containers/timeline';
import { Direction } from '../../graphql/types';
import { useKibana } from '../../lib/kibana';
import { KqlMode } from '../../store/timeline/model';
import { AutoSizer } from '../auto_sizer';
import { HeaderSection } from '../header_section';
import { ColumnHeader } from '../timeline/body/column_headers/column_header';
import { defaultHeaders } from '../timeline/body/column_headers/default_headers';
import { Sort } from '../timeline/body/sort';
import { StatefulBody } from '../timeline/body/stateful_body';
import { DataProvider } from '../timeline/data_providers/data_provider';
import { OnChangeItemsPerPage } from '../timeline/events';
import { Footer, footerHeight } from '../timeline/footer';
import { combineQueries } from '../timeline/helpers';
import { TimelineRefetch } from '../timeline/refetch_timeline';
import { isCompactFooter } from '../timeline/timeline';
import { ManageTimelineContext, TimelineTypeContextProps } from '../timeline/timeline_context';
import * as i18n from './translations';
import {
  esFilters,
  esQuery,
  IIndexPattern,
  Query,
} from '../../../../../../../src/plugins/data/public';

const DEFAULT_EVENTS_VIEWER_HEIGHT = 500;

const WrappedByAutoSizer = styled.div`
  width: 100%;
`; // required by AutoSizer
WrappedByAutoSizer.displayName = 'WrappedByAutoSizer';

interface Props {
  browserFields: BrowserFields;
  columns: ColumnHeader[];
  dataProviders: DataProvider[];
  deletedEventIds: Readonly<string[]>;
  end: number;
  filters: esFilters.Filter[];
  headerFilterGroup?: React.ReactNode;
  height?: number;
  id: string;
  indexPattern: IIndexPattern;
  isLive: boolean;
  itemsPerPage: number;
  itemsPerPageOptions: number[];
  kqlMode: KqlMode;
  onChangeItemsPerPage: OnChangeItemsPerPage;
  query: Query;
  showInspect: boolean;
  start: number;
  sort: Sort;
  timelineTypeContext: TimelineTypeContextProps;
  toggleColumn: (column: ColumnHeader) => void;
  utilityBar?: (totalCount: number) => React.ReactNode;
}

export const EventsViewer = React.memo<Props>(
  ({
    browserFields,
    columns,
    dataProviders,
    deletedEventIds,
    end,
    filters,
    headerFilterGroup,
    height = DEFAULT_EVENTS_VIEWER_HEIGHT,
    id,
    indexPattern,
    isLive,
    itemsPerPage,
    itemsPerPageOptions,
    kqlMode,
    onChangeItemsPerPage,
    query,
    showInspect,
    start,
    sort,
    timelineTypeContext,
    toggleColumn,
    utilityBar,
  }) => {
    const columnsHeader = isEmpty(columns) ? defaultHeaders : columns;
    const kibana = useKibana();
    const combinedQueries = combineQueries({
      config: esQuery.getEsQueryConfig(kibana.services.uiSettings),
      dataProviders,
      indexPattern,
      browserFields,
      filters,
      kqlQuery: query,
      kqlMode,
      start,
      end,
      isEventViewer: true,
    });
    const queryFields = useMemo(
      () =>
        union(
          columnsHeader.map(c => c.id),
          timelineTypeContext.queryFields ?? []
        ),
      [columnsHeader, timelineTypeContext.queryFields]
    );

    return (
      <EuiPanel data-test-subj="events-viewer-panel" grow={false}>
        <AutoSizer detectAnyWindowResize={true} content>
          {({ measureRef, content: { width = 0 } }) => (
            <>
              <WrappedByAutoSizer ref={measureRef}>
                <div
                  data-test-subj="events-viewer-measured"
                  style={{ height: '0px', width: '100%' }}
                />
              </WrappedByAutoSizer>

              {combinedQueries != null ? (
                <TimelineQuery
                  fields={queryFields}
                  filterQuery={combinedQueries.filterQuery}
                  id={id}
                  indexPattern={indexPattern}
                  limit={itemsPerPage}
                  sortField={{
                    sortFieldId: sort.columnId,
                    direction: sort.sortDirection as Direction,
                  }}
                  sourceId="default"
                >
                  {({
                    events,
                    getUpdatedAt,
                    inspect,
                    loading,
                    loadMore,
                    pageInfo,
                    refetch,
                    totalCount = 0,
                  }) => {
                    const totalCountMinusDeleted =
                      totalCount > 0 ? totalCount - deletedEventIds.length : 0;

                    // TODO: Reset eventDeletedIds/eventLoadingIds on refresh/loadmore (getUpdatedAt)
                    return (
                      <>
                        <HeaderSection
                          id={id}
                          showInspect={showInspect}
                          subtitle={
                            utilityBar
                              ? undefined
                              : `${
                                  i18n.SHOWING
                                }: ${totalCountMinusDeleted.toLocaleString()} ${i18n.UNIT(
                                  totalCountMinusDeleted
                                )}`
                          }
                          title={timelineTypeContext?.title ?? i18n.EVENTS}
                        >
                          {headerFilterGroup}
                        </HeaderSection>

                        {utilityBar?.(totalCountMinusDeleted)}

                        <div
                          data-test-subj={`events-container-loading-${loading}`}
                          style={{ width: `${width}px` }}
                        >
                          <ManageTimelineContext
                            loading={loading}
                            type={timelineTypeContext}
                            width={width}
                          >
                            <TimelineRefetch
                              id={id}
                              inputId="global"
                              inspect={inspect}
                              loading={loading}
                              refetch={refetch}
                            />

                            <StatefulBody
                              browserFields={browserFields}
                              data={events.filter(e => !deletedEventIds.includes(e._id))}
                              height={height}
                              id={id}
                              isEventViewer={true}
                              sort={sort}
                              toggleColumn={toggleColumn}
                            />

                            <Footer
                              compact={isCompactFooter(width)}
                              getUpdatedAt={getUpdatedAt}
                              hasNextPage={getOr(false, 'hasNextPage', pageInfo)!}
                              height={footerHeight}
                              isEventViewer={true}
                              isLive={isLive}
                              isLoading={loading}
                              itemsCount={events.length}
                              itemsPerPage={itemsPerPage}
                              itemsPerPageOptions={itemsPerPageOptions}
                              nextCursor={getOr(null, 'endCursor.value', pageInfo)!}
                              serverSideEventCount={totalCountMinusDeleted}
                              tieBreaker={getOr(null, 'endCursor.tiebreaker', pageInfo)}
                              onChangeItemsPerPage={onChangeItemsPerPage}
                              onLoadMore={loadMore}
                            />
                          </ManageTimelineContext>
                        </div>
                      </>
                    );
                  }}
                </TimelineQuery>
              ) : null}
            </>
          )}
        </AutoSizer>
      </EuiPanel>
    );
  },
  (prevProps, nextProps) =>
    prevProps.browserFields === nextProps.browserFields &&
    prevProps.columns === nextProps.columns &&
    prevProps.dataProviders === nextProps.dataProviders &&
    prevProps.deletedEventIds === nextProps.deletedEventIds &&
    prevProps.end === nextProps.end &&
    isEqual(prevProps.filters, nextProps.filters) &&
    prevProps.height === nextProps.height &&
    prevProps.id === nextProps.id &&
    prevProps.indexPattern === nextProps.indexPattern &&
    prevProps.isLive === nextProps.isLive &&
    prevProps.itemsPerPage === nextProps.itemsPerPage &&
    prevProps.itemsPerPageOptions === nextProps.itemsPerPageOptions &&
    prevProps.kqlMode === nextProps.kqlMode &&
    isEqual(prevProps.query, nextProps.query) &&
    prevProps.showInspect === nextProps.showInspect &&
    prevProps.start === nextProps.start &&
    prevProps.sort === nextProps.sort &&
    isEqual(prevProps.timelineTypeContext, nextProps.timelineTypeContext) &&
    prevProps.utilityBar === nextProps.utilityBar
);
EventsViewer.displayName = 'EventsViewer';
