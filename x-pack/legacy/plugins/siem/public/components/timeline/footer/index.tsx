/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPopover,
  EuiText,
  EuiToolTip,
  EuiPopoverProps,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { FunctionComponent, useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

import { LoadingPanel } from '../../loading';
import { OnChangeItemsPerPage, OnLoadMore } from '../events';

import { LastUpdatedAt } from './last_updated';
import * as i18n from './translations';
import { useTimelineTypeContext } from '../timeline_context';

const FixedWidthLastUpdated = styled.div<{ compact: boolean }>`
  width: ${({ compact }) => (!compact ? 200 : 25)}px;
  overflow: hidden;
  text-align: end;
`;

FixedWidthLastUpdated.displayName = 'FixedWidthLastUpdated';

const FooterContainer = styled(EuiFlexGroup)<{ height: number }>`
  height: ${({ height }) => height}px;
`;

FooterContainer.displayName = 'FooterContainer';

const FooterFlexGroup = styled(EuiFlexGroup)`
  height: 35px;
  width: 100%;
`;

FooterFlexGroup.displayName = 'FooterFlexGroup';

const LoadingPanelContainer = styled.div`
  padding-top: 3px;
`;

LoadingPanelContainer.displayName = 'LoadingPanelContainer';

const PopoverRowItems = styled((EuiPopover as unknown) as FunctionComponent)<
  EuiPopoverProps & {
    className?: string;
    id?: string;
  }
>`
  .euiButtonEmpty__content {
    padding: 0px 0px;
  }
`;

PopoverRowItems.displayName = 'PopoverRowItems';

export const ServerSideEventCount = styled.div`
  margin: 0 5px 0 5px;
`;

ServerSideEventCount.displayName = 'ServerSideEventCount';

/** The height of the footer, exported for use in height calculations */
export const footerHeight = 40; // px

/** Displays the server-side count of events */
export const EventsCountComponent = ({
  closePopover,
  isOpen,
  items,
  itemsCount,
  onClick,
  serverSideEventCount,
}: {
  closePopover: () => void;
  isOpen: boolean;
  items: React.ReactElement[];
  itemsCount: number;
  onClick: () => void;
  serverSideEventCount: number;
}) => {
  const timelineTypeContext = useTimelineTypeContext();
  return (
    <h5>
      <PopoverRowItems
        button={
          <>
            <EuiBadge color="hollow" data-test-subj="local-events-count">
              {itemsCount}
              <EuiButtonEmpty
                color="text"
                iconSide="right"
                iconType="arrowDown"
                size="s"
                onClick={onClick}
              />
            </EuiBadge>
            {` ${i18n.OF} `}
          </>
        }
        className="footer-popover"
        closePopover={closePopover}
        data-test-subj="timelineSizeRowPopover"
        id="customizablePagination"
        isOpen={isOpen}
        panelPaddingSize="none"
      >
        <EuiContextMenuPanel data-test-subj="timelinePickSizeRow" items={items} />
      </PopoverRowItems>
      <EuiToolTip
        content={`${serverSideEventCount} ${timelineTypeContext.footerText ??
          i18n.TOTAL_COUNT_OF_EVENTS}`}
      >
        <ServerSideEventCount>
          <EuiBadge color="hollow" data-test-subj="server-side-event-count">
            {serverSideEventCount}
          </EuiBadge>{' '}
          {timelineTypeContext.documentType ?? i18n.EVENTS}
        </ServerSideEventCount>
      </EuiToolTip>
    </h5>
  );
};

EventsCountComponent.displayName = 'EventsCountComponent';

export const EventsCount = React.memo(EventsCountComponent);

EventsCount.displayName = 'EventsCount';

export const PagingControlComponent = ({
  hasNextPage,
  isLoading,
  loadMore,
}: {
  hasNextPage: boolean;
  isLoading: boolean;
  loadMore: () => void;
}) => (
  <>
    {hasNextPage && (
      <EuiButton
        data-test-subj="TimelineMoreButton"
        isLoading={isLoading}
        size="s"
        onClick={loadMore}
      >
        {isLoading ? `${i18n.LOADING}...` : i18n.LOAD_MORE}
      </EuiButton>
    )}
  </>
);

PagingControlComponent.displayName = 'PagingControlComponent';

export const PagingControl = React.memo(PagingControlComponent);

PagingControl.displayName = 'PagingControl';

interface FooterProps {
  compact: boolean;
  getUpdatedAt: () => number;
  hasNextPage: boolean;
  height: number;
  isEventViewer?: boolean;
  isLive: boolean;
  isLoading: boolean;
  itemsCount: number;
  itemsPerPage: number;
  itemsPerPageOptions: number[];
  nextCursor: string;
  onChangeItemsPerPage: OnChangeItemsPerPage;
  onLoadMore: OnLoadMore;
  serverSideEventCount: number;
  tieBreaker: string;
}

/** Renders a loading indicator and paging controls */
export const FooterComponent = ({
  compact,
  getUpdatedAt,
  hasNextPage,
  height,
  isEventViewer,
  isLive,
  isLoading,
  itemsCount,
  itemsPerPage,
  itemsPerPageOptions,
  nextCursor,
  onChangeItemsPerPage,
  onLoadMore,
  serverSideEventCount,
  tieBreaker,
}: FooterProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const timelineTypeContext = useTimelineTypeContext();

  const loadMore = useCallback(() => {
    setPaginationLoading(true);
    onLoadMore(nextCursor, tieBreaker);
  }, [nextCursor, tieBreaker, onLoadMore]);

  const onButtonClick = useCallback(() => setIsPopoverOpen(!isPopoverOpen), [isPopoverOpen]);

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  useEffect(() => {
    if (paginationLoading && !isLoading) {
      setPaginationLoading(false);
      setUpdatedAt(getUpdatedAt());
    }

    if (updatedAt === null || !isLoading) {
      setUpdatedAt(getUpdatedAt());
    }
  }, [isLoading]);

  if (isLoading && !paginationLoading) {
    return (
      <LoadingPanelContainer>
        <LoadingPanel
          data-test-subj="LoadingPanelTimeline"
          height="35px"
          showBorder={false}
          text={`${timelineTypeContext.loadingText ?? i18n.LOADING_TIMELINE_DATA}...`}
          width="100%"
        />
      </LoadingPanelContainer>
    );
  }

  const rowItems =
    itemsPerPageOptions &&
    itemsPerPageOptions.map(item => (
      <EuiContextMenuItem
        key={item}
        icon={itemsPerPage === item ? 'check' : 'empty'}
        onClick={() => {
          closePopover();
          onChangeItemsPerPage(item);
        }}
      >
        {`${item} ${i18n.ROWS}`}
      </EuiContextMenuItem>
    ));

  return (
    <>
      <FooterContainer
        data-test-subj="timeline-footer"
        direction="column"
        gutterSize="none"
        height={height}
        justifyContent="spaceAround"
      >
        <FooterFlexGroup
          alignItems="center"
          data-test-subj="footer-flex-group"
          direction="row"
          gutterSize="none"
          justifyContent="spaceBetween"
        >
          <EuiFlexItem data-test-subj="event-count-container" grow={false}>
            <EuiFlexGroup
              alignItems="center"
              data-test-subj="events-count"
              direction="row"
              gutterSize="none"
            >
              <EventsCount
                closePopover={closePopover}
                isOpen={isPopoverOpen}
                items={rowItems}
                itemsCount={itemsCount}
                serverSideEventCount={serverSideEventCount}
                onClick={onButtonClick}
              />
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem data-test-subj="paging-control-container" grow={false}>
            {isLive ? (
              <EuiText data-test-subj="is-live-on-message" size="s">
                <b>
                  {i18n.AUTO_REFRESH_ACTIVE}{' '}
                  <EuiIconTip
                    color="subdued"
                    content={
                      <FormattedMessage
                        defaultMessage="While auto-refresh is enabled, timeline will show you the latest {numberOfItems} events that match your query."
                        id="xpack.siem.footer.autoRefreshActiveTooltip"
                        values={{
                          numberOfItems: itemsCount,
                        }}
                      />
                    }
                    type="iInCircle"
                  />
                </b>
              </EuiText>
            ) : (
              <PagingControl
                data-test-subj="paging-control"
                hasNextPage={hasNextPage}
                isLoading={isLoading}
                loadMore={loadMore}
              />
            )}
          </EuiFlexItem>

          <EuiFlexItem data-test-subj="last-updated-container" grow={false}>
            <FixedWidthLastUpdated compact={compact} data-test-subj="fixed-width-last-updated">
              <LastUpdatedAt compact={compact} updatedAt={updatedAt || getUpdatedAt()} />
            </FixedWidthLastUpdated>
          </EuiFlexItem>
        </FooterFlexGroup>
      </FooterContainer>
    </>
  );
};

FooterComponent.displayName = 'FooterComponent';

export const Footer = React.memo(
  FooterComponent,
  (prevProps, nextProps) =>
    prevProps.compact === nextProps.compact &&
    prevProps.hasNextPage === nextProps.hasNextPage &&
    prevProps.height === nextProps.height &&
    prevProps.isEventViewer === nextProps.isEventViewer &&
    prevProps.isLive === nextProps.isLive &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.itemsCount === nextProps.itemsCount &&
    prevProps.itemsPerPage === nextProps.itemsPerPage &&
    prevProps.itemsPerPageOptions === nextProps.itemsPerPageOptions &&
    prevProps.serverSideEventCount === nextProps.serverSideEventCount
);

Footer.displayName = 'Footer';
