/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';

import euiStyled from '../../../../../../common/eui_styled_components';
import { AutoSizer } from '../../../components/auto_sizer';
import { LogEntryFlyout } from '../../../components/logging/log_entry_flyout';
import { LogMinimap } from '../../../components/logging/log_minimap';
import { ScrollableLogTextStreamView } from '../../../components/logging/log_text_stream';
import { PageContent } from '../../../components/page';

import { WithSummary } from '../../../containers/logs/log_summary';
import { LogViewConfiguration } from '../../../containers/logs/log_view_configuration';
import { WithLogFilter, WithLogFilterUrlState } from '../../../containers/logs/with_log_filter';
import {
  LogFlyout as LogFlyoutState,
  WithFlyoutOptionsUrlState,
} from '../../../containers/logs/log_flyout';
import { WithLogMinimapUrlState } from '../../../containers/logs/with_log_minimap';
import { WithLogPositionUrlState } from '../../../containers/logs/with_log_position';
import { WithLogPosition } from '../../../containers/logs/with_log_position';
import { WithLogTextviewUrlState } from '../../../containers/logs/with_log_textview';
import { ReduxSourceIdBridge, WithStreamItems } from '../../../containers/logs/with_stream_items';
import { Source } from '../../../containers/source';

import { LogsToolbar } from './page_toolbar';
import { LogHighlightsBridge, LogHighlightsState } from '../../../containers/logs/log_highlights';

export const LogsPageLogsContent: React.FunctionComponent = () => {
  const { createDerivedIndexPattern, source, sourceId, version } = useContext(Source.Context);
  const { intervalSize, textScale, textWrap } = useContext(LogViewConfiguration.Context);
  const {
    setFlyoutVisibility,
    flyoutVisible,
    setFlyoutId,
    surroundingLogsId,
    setSurroundingLogsId,
    flyoutItem,
    isLoading,
  } = useContext(LogFlyoutState.Context);
  const { logSummaryHighlights } = useContext(LogHighlightsState.Context);
  const derivedIndexPattern = createDerivedIndexPattern('logs');

  return (
    <>
      <ReduxSourceIdBridge sourceId={sourceId} />
      <LogHighlightsBridge indexPattern={derivedIndexPattern} />
      <WithLogFilterUrlState indexPattern={derivedIndexPattern} />
      <WithLogPositionUrlState />
      <WithLogMinimapUrlState />
      <WithLogTextviewUrlState />
      <WithFlyoutOptionsUrlState />
      <LogsToolbar />
      <WithLogFilter indexPattern={derivedIndexPattern}>
        {({ applyFilterQueryFromKueryExpression }) => (
          <WithLogPosition>
            {({ jumpToTargetPosition, stopLiveStreaming }) =>
              flyoutVisible ? (
                <LogEntryFlyout
                  setFilter={applyFilterQueryFromKueryExpression}
                  setTarget={(timeKey, flyoutItemId) => {
                    jumpToTargetPosition(timeKey);
                    setSurroundingLogsId(flyoutItemId);
                    stopLiveStreaming();
                  }}
                  setFlyoutVisibility={setFlyoutVisibility}
                  flyoutItem={flyoutItem}
                  loading={isLoading}
                />
              ) : null
            }
          </WithLogPosition>
        )}
      </WithLogFilter>
      <PageContent key={`${sourceId}-${version}`}>
        <WithLogPosition>
          {({
            isAutoReloading,
            jumpToTargetPosition,
            reportVisiblePositions,
            targetPosition,
            scrollLockLiveStreaming,
            scrollUnlockLiveStreaming,
            isScrollLocked,
          }) => (
            <WithStreamItems initializeOnMount={!isAutoReloading}>
              {({
                currentHighlightKey,
                hasMoreAfterEnd,
                hasMoreBeforeStart,
                isLoadingMore,
                isReloading,
                items,
                lastLoadedTime,
                loadNewerEntries,
              }) => (
                <ScrollableLogTextStreamView
                  columnConfigurations={(source && source.configuration.logColumns) || []}
                  hasMoreAfterEnd={hasMoreAfterEnd}
                  hasMoreBeforeStart={hasMoreBeforeStart}
                  isLoadingMore={isLoadingMore}
                  isReloading={isReloading}
                  isStreaming={isAutoReloading}
                  items={items}
                  jumpToTarget={jumpToTargetPosition}
                  lastLoadedTime={lastLoadedTime}
                  loadNewerItems={loadNewerEntries}
                  reportVisibleInterval={reportVisiblePositions}
                  scale={textScale}
                  target={targetPosition}
                  wrap={textWrap}
                  setFlyoutItem={setFlyoutId}
                  setFlyoutVisibility={setFlyoutVisibility}
                  highlightedItem={surroundingLogsId ? surroundingLogsId : null}
                  currentHighlightKey={currentHighlightKey}
                  scrollLock={{
                    enable: scrollLockLiveStreaming,
                    disable: scrollUnlockLiveStreaming,
                    isEnabled: isScrollLocked,
                  }}
                />
              )}
            </WithStreamItems>
          )}
        </WithLogPosition>
        <AutoSizer content bounds detectAnyWindowResize="height">
          {({ measureRef, bounds: { height = 0 }, content: { width = 0 } }) => {
            return (
              <LogPageMinimapColumn innerRef={measureRef}>
                <WithSummary>
                  {({ buckets }) => (
                    <WithLogPosition>
                      {({
                        isAutoReloading,
                        jumpToTargetPosition,
                        visibleMidpointTime,
                        visibleTimeInterval,
                      }) => (
                        <WithStreamItems initializeOnMount={!isAutoReloading}>
                          {({ isReloading }) => (
                            <LogMinimap
                              height={height}
                              width={width}
                              highlightedInterval={isReloading ? null : visibleTimeInterval}
                              intervalSize={intervalSize}
                              jumpToTarget={jumpToTargetPosition}
                              summaryBuckets={buckets}
                              summaryHighlightBuckets={
                                logSummaryHighlights.length > 0
                                  ? logSummaryHighlights[0].buckets
                                  : []
                              }
                              target={visibleMidpointTime}
                            />
                          )}
                        </WithStreamItems>
                      )}
                    </WithLogPosition>
                  )}
                </WithSummary>
              </LogPageMinimapColumn>
            );
          }}
        </AutoSizer>
      </PageContent>
    </>
  );
};

const LogPageMinimapColumn = euiStyled.div`
  flex: 1 0 0%;
  overflow: hidden;
  min-width: 100px;
  max-width: 100px;
  display: flex;
  flex-direction: column;
`;
