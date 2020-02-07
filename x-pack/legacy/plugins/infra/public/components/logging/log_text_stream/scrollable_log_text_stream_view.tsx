/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Fragment, useMemo } from 'react';
import moment from 'moment';

import euiStyled from '../../../../../../common/eui_styled_components';
import { TextScale } from '../../../../common/log_text_scale';
import { TimeKey, UniqueTimeKey } from '../../../../common/time';
import { callWithoutRepeats } from '../../../utils/handlers';
import { LogColumnConfiguration } from '../../../utils/source_configuration';
import { AutoSizer } from '../../auto_sizer';
import { NoData } from '../../empty_states';
import { useFormattedTime } from '../../formatted_time';
import { InfraLoadingPanel } from '../../loading';
import { getStreamItemBeforeTimeKey, getStreamItemId, parseStreamItemId, StreamItem } from './item';
import { LogColumnHeaders } from './column_headers';
import { LogTextStreamLoadingItemView } from './loading_item_view';
import { LogTextStreamJumpToTail } from './jump_to_tail';
import { LogEntryRow } from './log_entry_row';
import { MeasurableItemView } from './measurable_item_view';
import { VerticalScrollPanel } from './vertical_scroll_panel';
import { getColumnWidths, LogEntryColumnWidths } from './log_entry_column';
import { useMeasuredCharacterDimensions } from './text_styles';
import { LogDateRow } from './log_date_row';

interface ScrollableLogTextStreamViewProps {
  columnConfigurations: LogColumnConfiguration[];
  items: StreamItem[];
  scale: TextScale;
  wrap: boolean;
  isReloading: boolean;
  isLoadingMore: boolean;
  hasMoreBeforeStart: boolean;
  hasMoreAfterEnd: boolean;
  isStreaming: boolean;
  lastLoadedTime: Date | null;
  target: TimeKey | null;
  jumpToTarget: (target: TimeKey) => any;
  reportVisibleInterval: (params: {
    pagesBeforeStart: number;
    pagesAfterEnd: number;
    startKey: TimeKey | null;
    middleKey: TimeKey | null;
    endKey: TimeKey | null;
    fromScroll: boolean;
  }) => any;
  loadNewerItems: () => void;
  reloadItems: () => void;
  setFlyoutItem: (id: string) => void;
  setFlyoutVisibility: (visible: boolean) => void;
  highlightedItem: string | null;
  currentHighlightKey: UniqueTimeKey | null;
}

interface ScrollableLogTextStreamViewState {
  target: TimeKey | null;
  targetId: string | null;
  items: StreamItem[];
  isScrollLocked: boolean;
}

export class ScrollableLogTextStreamView extends React.PureComponent<
  ScrollableLogTextStreamViewProps,
  ScrollableLogTextStreamViewState
> {
  public static getDerivedStateFromProps(
    nextProps: ScrollableLogTextStreamViewProps,
    prevState: ScrollableLogTextStreamViewState
  ): Partial<ScrollableLogTextStreamViewState> | null {
    const hasNewTarget = nextProps.target && nextProps.target !== prevState.target;
    const hasItems = nextProps.items.length > 0;

    // Prevent new entries from being appended and moving the stream forward when
    // the user has scrolled up during live streaming
    const nextItems = hasItems && prevState.isScrollLocked ? prevState.items : nextProps.items;

    if (nextProps.isStreaming && hasItems) {
      return {
        target: nextProps.target,
        targetId: getStreamItemId(nextProps.items[nextProps.items.length - 1]),
        items: nextItems,
      };
    } else if (hasNewTarget && hasItems) {
      return {
        target: nextProps.target,
        targetId: getStreamItemId(getStreamItemBeforeTimeKey(nextProps.items, nextProps.target!)),
        items: nextItems,
      };
    } else if (!nextProps.target || !hasItems) {
      return {
        target: null,
        targetId: null,
        items: [],
      };
    } else if (
      hasItems &&
      (nextItems.length !== prevState.items.length || nextItems[0] !== prevState.items[0])
    ) {
      return {
        ...prevState,
        items: nextItems,
      };
    }

    return null;
  }

  constructor(props: ScrollableLogTextStreamViewProps) {
    super(props);
    this.state = {
      target: null,
      targetId: null,
      items: props.items,
      isScrollLocked: false,
    };
  }

  public render() {
    const {
      columnConfigurations,
      currentHighlightKey,
      hasMoreAfterEnd,
      hasMoreBeforeStart,
      highlightedItem,
      isLoadingMore,
      isReloading,
      isStreaming,
      lastLoadedTime,
      scale,
      wrap,
    } = this.props;
    const { targetId, items, isScrollLocked } = this.state;
    const hasItems = items.length > 0;
    return (
      <ScrollableLogTextStreamViewWrapper>
        {isReloading && (!isStreaming || !hasItems) ? (
          <InfraLoadingPanel
            width="100%"
            height="100%"
            text={
              <FormattedMessage
                id="xpack.infra.logs.scrollableLogTextStreamView.loadingEntriesLabel"
                defaultMessage="Loading entries"
              />
            }
          />
        ) : !hasItems ? (
          <NoData
            titleText={i18n.translate('xpack.infra.logs.emptyView.noLogMessageTitle', {
              defaultMessage: 'There are no log messages to display.',
            })}
            bodyText={i18n.translate('xpack.infra.logs.emptyView.noLogMessageDescription', {
              defaultMessage: 'Try adjusting your filter.',
            })}
            refetchText={i18n.translate('xpack.infra.logs.emptyView.checkForNewDataButtonLabel', {
              defaultMessage: 'Check for new data',
            })}
            onRefetch={this.handleReload}
            testString="logsNoDataPrompt"
          />
        ) : (
          <WithColumnWidths columnConfigurations={columnConfigurations} scale={scale}>
            {({ columnWidths, CharacterDimensionsProbe }) => (
              <>
                <CharacterDimensionsProbe />
                <LogColumnHeaders
                  columnConfigurations={columnConfigurations}
                  columnWidths={columnWidths}
                />
                <AutoSizer bounds content detectAnyWindowResize="height">
                  {({ measureRef, bounds: { height = 0 }, content: { width = 0 } }) => (
                    <ScrollPanelSizeProbe ref={measureRef}>
                      <VerticalScrollPanel
                        height={height}
                        width={width}
                        onVisibleChildrenChange={this.handleVisibleChildrenChange}
                        target={targetId}
                        hideScrollbar={true}
                        data-test-subj={'logStream'}
                        isLocked={isScrollLocked}
                        entriesCount={items.length}
                      >
                        {registerChild => (
                          <>
                            <LogTextStreamLoadingItemView
                              alignment="bottom"
                              isLoading={isLoadingMore}
                              hasMore={hasMoreBeforeStart}
                              isStreaming={false}
                              lastStreamingUpdate={null}
                            />
                            {items.map((item, idx) => {
                              const currentTimestamp = item.logEntry.key.time;
                              let showDate = false;

                              if (idx > 0) {
                                const prevTimestamp = items[idx - 1].logEntry.key.time;
                                showDate = !moment(currentTimestamp).isSame(prevTimestamp, 'day');
                              }

                              return (
                                <Fragment key={getStreamItemId(item)}>
                                  {showDate && <LogDateRow timestamp={currentTimestamp} />}
                                  <MeasurableItemView
                                    register={registerChild}
                                    registrationKey={getStreamItemId(item)}
                                  >
                                    {itemMeasureRef => (
                                      <LogEntryRow
                                        columnConfigurations={columnConfigurations}
                                        columnWidths={columnWidths}
                                        openFlyoutWithItem={this.handleOpenFlyout}
                                        boundingBoxRef={itemMeasureRef}
                                        logEntry={item.logEntry}
                                        highlights={item.highlights}
                                        isActiveHighlight={
                                          !!currentHighlightKey &&
                                          currentHighlightKey.gid === item.logEntry.gid
                                        }
                                        scale={scale}
                                        wrap={wrap}
                                        isHighlighted={
                                          highlightedItem
                                            ? item.logEntry.gid === highlightedItem
                                            : false
                                        }
                                      />
                                    )}
                                  </MeasurableItemView>
                                </Fragment>
                              );
                            })}
                            <LogTextStreamLoadingItemView
                              alignment="top"
                              isLoading={isStreaming || isLoadingMore}
                              hasMore={hasMoreAfterEnd}
                              isStreaming={isStreaming}
                              lastStreamingUpdate={isStreaming ? lastLoadedTime : null}
                              onLoadMore={this.handleLoadNewerItems}
                            />
                            {isScrollLocked && (
                              <LogTextStreamJumpToTail
                                width={width}
                                onClickJump={this.handleJumpToTail}
                              />
                            )}
                          </>
                        )}
                      </VerticalScrollPanel>
                    </ScrollPanelSizeProbe>
                  )}
                </AutoSizer>
              </>
            )}
          </WithColumnWidths>
        )}
      </ScrollableLogTextStreamViewWrapper>
    );
  }

  private handleOpenFlyout = (id: string) => {
    this.props.setFlyoutItem(id);
    this.props.setFlyoutVisibility(true);
  };

  private handleReload = () => {
    const { reloadItems } = this.props;

    if (reloadItems) {
      reloadItems();
    }
  };

  private handleLoadNewerItems = () => {
    const { loadNewerItems } = this.props;

    if (loadNewerItems) {
      loadNewerItems();
    }
  };

  // this is actually a method but not recognized as such
  // eslint-disable-next-line @typescript-eslint/member-ordering
  private handleVisibleChildrenChange = callWithoutRepeats(
    ({
      topChild,
      middleChild,
      bottomChild,
      pagesAbove,
      pagesBelow,
      fromScroll,
    }: {
      topChild: string;
      middleChild: string;
      bottomChild: string;
      pagesAbove: number;
      pagesBelow: number;
      fromScroll: boolean;
    }) => {
      if (fromScroll && this.props.isStreaming) {
        this.setState({
          isScrollLocked: pagesBelow !== 0,
        });
      }
      this.props.reportVisibleInterval({
        endKey: parseStreamItemId(bottomChild),
        middleKey: parseStreamItemId(middleChild),
        pagesAfterEnd: pagesBelow,
        pagesBeforeStart: pagesAbove,
        startKey: parseStreamItemId(topChild),
        fromScroll,
      });
    }
  );

  private handleJumpToTail = () => {
    const { items } = this.props;
    const lastItemTarget = getStreamItemId(items[items.length - 1]);
    this.setState({
      targetId: lastItemTarget,
      isScrollLocked: false,
    });
  };
}

/**
 * This function-as-child component calculates the column widths based on the
 * given configuration. It depends on the `CharacterDimensionsProbe` it returns
 * being rendered so it can measure the monospace character size.
 *
 * If the above component wasn't a class component, this would have been
 * written as a hook.
 */
const WithColumnWidths: React.FunctionComponent<{
  children: (params: {
    columnWidths: LogEntryColumnWidths;
    CharacterDimensionsProbe: React.ComponentType;
  }) => React.ReactElement<any> | null;
  columnConfigurations: LogColumnConfiguration[];
  scale: TextScale;
}> = ({ children, columnConfigurations, scale }) => {
  const { CharacterDimensionsProbe, dimensions } = useMeasuredCharacterDimensions(scale);
  const referenceTime = useMemo(() => Date.now(), []);
  const formattedCurrentDate = useFormattedTime(referenceTime, { format: 'time' });
  const columnWidths = useMemo(
    () => getColumnWidths(columnConfigurations, dimensions.width, formattedCurrentDate.length),
    [columnConfigurations, dimensions.width, formattedCurrentDate]
  );
  const childParams = useMemo(
    () => ({
      columnWidths,
      CharacterDimensionsProbe,
    }),
    [columnWidths, CharacterDimensionsProbe]
  );

  return children(childParams);
};

const ScrollableLogTextStreamViewWrapper = euiStyled.div`
  overflow: hidden;
  display: flex;
  flex: 1 1 0%;
  flex-direction: column;
  align-items: stretch;
`;

const ScrollPanelSizeProbe = euiStyled.div`
  overflow: hidden;
  flex: 1 1 0%;
`;
