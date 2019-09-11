/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiPanel } from '@elastic/eui';
import { getOr, isEmpty } from 'lodash/fp';
import React from 'react';
import styled from 'styled-components';
import { StaticIndexPattern } from 'ui/index_patterns';

import { AutoSizer } from '../auto_sizer';
import { BrowserFields } from '../../containers/source';
import { TimelineQuery } from '../../containers/timeline';
import { Direction } from '../../graphql/types';
import { KqlMode } from '../../store/timeline/model';
import { ColumnHeader } from '../timeline/body/column_headers/column_header';
import { defaultHeaders } from '../timeline/body/column_headers/default_headers';
import { Sort } from '../timeline/body/sort';
import { StatefulBody } from '../timeline/body/stateful_body';
import { DataProvider } from '../timeline/data_providers/data_provider';
import { OnChangeItemsPerPage } from '../timeline/events';
import { Footer, footerHeight } from '../timeline/footer';
import { combineQueries } from '../timeline/helpers';
import { isCompactFooter } from '../timeline/timeline';
import { ManageTimelineContext } from '../timeline/timeline_context';

import { EventsViewerHeader } from './events_viewer_header';

const DEFAULT_EVENTS_VIEWER_HEIGHT = 500;

const WrappedByAutoSizer = styled.div`
  width: 100%;
`; // required by AutoSizer

WrappedByAutoSizer.displayName = 'WrappedByAutoSizer';

const EventsViewerContainer = styled(EuiFlexGroup)`
  overflow: hidden;
  padding: 0 10px 0 12px;
  user-select: none;
  width: 100%;
`;

EventsViewerContainer.displayName = 'EventsViewerContainer';

interface Props {
  browserFields: BrowserFields;
  columns: ColumnHeader[];
  dataProviders: DataProvider[];
  end: number;
  height?: number;
  id: string;
  indexPattern: StaticIndexPattern;
  isLive: boolean;
  itemsPerPage: number;
  itemsPerPageOptions: number[];
  kqlMode: KqlMode;
  kqlQueryExpression: string;
  onChangeItemsPerPage: OnChangeItemsPerPage;
  showInspect: boolean;
  start: number;
  sort: Sort;
  toggleColumn: (column: ColumnHeader) => void;
}

export const EventsViewer = React.memo<Props>(
  ({
    browserFields,
    columns,
    dataProviders,
    end,
    height = DEFAULT_EVENTS_VIEWER_HEIGHT,
    id,
    indexPattern,
    isLive,
    itemsPerPage,
    itemsPerPageOptions,
    kqlMode,
    kqlQueryExpression,
    onChangeItemsPerPage,
    showInspect,
    start,
    sort,
    toggleColumn,
  }) => {
    const columnsHeader = isEmpty(columns) ? defaultHeaders : columns;

    const combinedQueries = combineQueries(
      dataProviders,
      indexPattern,
      browserFields,
      kqlQueryExpression,
      kqlMode,
      start,
      end,
      true
    );

    return (
      <EuiPanel data-test-subj="events-viewer-panel" grow={false}>
        <AutoSizer detectAnyWindowResize={true} content>
          {({ measureRef, content: { width = 0 } }) => (
            <EventsViewerContainer
              data-test-subj="events-viewer-container"
              direction="column"
              gutterSize="none"
              justifyContent="flexStart"
            >
              <WrappedByAutoSizer innerRef={measureRef}>
                <div
                  data-test-subj="events-viewer-measured"
                  style={{ height: '0px', width: '100%' }}
                />
              </WrappedByAutoSizer>
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
                    getUpdatedAt,
                    inspect,
                    loading,
                    loadMore,
                    pageInfo,
                    refetch,
                    totalCount = 0,
                  }) => (
                    <>
                      <EventsViewerHeader
                        id={id}
                        showInspect={showInspect}
                        totalCount={totalCount}
                      />

                      <div data-test-subj="events-container" style={{ width: `${width}px` }}>
                        <ManageTimelineContext loading={loading} width={width}>
                          <StatefulBody
                            browserFields={browserFields}
                            data={events}
                            id={id}
                            isEventViewer={true}
                            height={height}
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
                            onChangeItemsPerPage={onChangeItemsPerPage}
                            onLoadMore={loadMore}
                            nextCursor={getOr(null, 'endCursor.value', pageInfo)!}
                            serverSideEventCount={totalCount}
                            tieBreaker={getOr(null, 'endCursor.tiebreaker', pageInfo)}
                          />
                        </ManageTimelineContext>
                      </div>
                    </>
                  )}
                </TimelineQuery>
              ) : null}
            </EventsViewerContainer>
          )}
        </AutoSizer>
      </EuiPanel>
    );
  },
  (prevProps, nextProps) =>
    prevProps.browserFields === nextProps.browserFields &&
    prevProps.columns === nextProps.columns &&
    prevProps.dataProviders === nextProps.dataProviders &&
    prevProps.end === nextProps.end &&
    prevProps.height === nextProps.height &&
    prevProps.id === nextProps.id &&
    prevProps.indexPattern === nextProps.indexPattern &&
    prevProps.isLive === nextProps.isLive &&
    prevProps.itemsPerPage === nextProps.itemsPerPage &&
    prevProps.itemsPerPageOptions === nextProps.itemsPerPageOptions &&
    prevProps.kqlMode === nextProps.kqlMode &&
    prevProps.kqlQueryExpression === nextProps.kqlQueryExpression &&
    prevProps.showInspect === nextProps.showInspect &&
    prevProps.start === nextProps.start &&
    prevProps.sort === nextProps.sort
);

EventsViewer.displayName = 'EventsViewer';
