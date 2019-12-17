/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';

import { LogFlyout } from '../../../containers/logs/log_flyout';
import { LogViewConfiguration } from '../../../containers/logs/log_view_configuration';
import { LogHighlightsState } from '../../../containers/logs/log_highlights/log_highlights';
import { LogPositionState, WithLogPositionUrlState } from '../../../containers/logs/log_position';
import { LogFilterState } from '../../../containers/logs/log_filter';
import { LogEntriesState } from '../../../containers/logs/log_entries';

import { Source } from '../../../containers/source';

const LogFilterStateProvider: React.FC = ({ children }) => {
  const { createDerivedIndexPattern } = useContext(Source.Context);
  const derivedIndexPattern = createDerivedIndexPattern('logs');
  return (
    <LogFilterState.Provider indexPattern={derivedIndexPattern}>{children}</LogFilterState.Provider>
  );
};

const LogEntriesStateProvider: React.FC = ({ children }) => {
  const { sourceId } = useContext(Source.Context);
  const [{ targetPosition, pagesBeforeStart, pagesAfterEnd, isAutoReloading }] = useContext(
    LogPositionState.Context
  );
  const { filterQuery } = useContext(LogFilterState.Context);
  const entriesProps = {
    timeKey: targetPosition,
    pagesBeforeStart,
    pagesAfterEnd,
    filterQuery,
    sourceId,
    isAutoReloading,
  };
  return <LogEntriesState.Provider {...entriesProps}>{children}</LogEntriesState.Provider>;
};

const LogHighlightsStateProvider: React.FC = ({ children }) => {
  const { sourceId, version } = useContext(Source.Context);
  const [{ entriesStart, entriesEnd }] = useContext(LogEntriesState.Context);
  const { filterQuery } = useContext(LogFilterState.Context);
  const highlightsProps = {
    sourceId,
    sourceVersion: version,
    entriesStart,
    entriesEnd,
    filterQuery,
  };
  return <LogHighlightsState.Provider {...highlightsProps}>{children}</LogHighlightsState.Provider>;
};

export const LogsPageProviders: React.FunctionComponent = ({ children }) => {
  return (
    <LogViewConfiguration.Provider>
      <LogFlyout.Provider>
        <LogPositionState.Provider>
          <WithLogPositionUrlState />
          <LogFilterStateProvider>
            <LogEntriesStateProvider>
              <LogHighlightsStateProvider>{children}</LogHighlightsStateProvider>
            </LogEntriesStateProvider>
          </LogFilterStateProvider>
        </LogPositionState.Provider>
      </LogFlyout.Provider>
    </LogViewConfiguration.Provider>
  );
};
