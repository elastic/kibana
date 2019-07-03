/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate-latest';
import { useCallback, useEffect, useState, useMemo } from 'react';

import {
  LogEntryHighlightsMap,
  getLogEntryIndexBeforeTime,
  getLogEntryIndexAtTime,
} from '../../../utils/log_entry';

import { TimeKey, getPreviousTimeKey, getNextTimeKey } from '../../../../common/time';
import { LogEntryHighlightsQuery } from '../../../graphql/types';
import { DependencyError, useApolloClient } from '../../../utils/apollo_context';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { logEntryHighlightsQuery } from './log_highlights.gql_query';

type LogEntryHighlights = LogEntryHighlightsQuery.Query['source']['logEntryHighlights'];

export const useLogHighlightsState = ({
  sourceId,
  sourceVersion,
}: {
  sourceId: string;
  sourceVersion: string | undefined;
}) => {
  const [highlightTerms, setHighlightTerms] = useState<string[]>([]);
  const apolloClient = useApolloClient();
  const [logEntryHighlights, setLogEntryHighlights] = useState<LogEntryHighlights | undefined>(
    undefined
  );
  const [startKey, setStartKey] = useState<TimeKey | null>(null);
  const [endKey, setEndKey] = useState<TimeKey | null>(null);
  const [filterQuery, setFilterQuery] = useState<string | null>(null);
  const [visibleMidpoint, setVisibleMidpoint] = useState<TimeKey | null>(null);
  const [previousHighlightLogEntryIndex, setPreviousHighlightLogEntryIndex] = useState<
    number | null
  >(null);
  const [nextHighlightLogEntryIndex, setNextHighlightLogEntryIndex] = useState<number | null>(null);
  const [targetHighlightPosition, setTargetHighlightPosition] = useState<TimeKey | null>(null);

  useEffect(
    () => {
      if (visibleMidpoint && logEntryHighlights && logEntryHighlights[0]) {
        const currentHighlightIndexOfMidpoint = getLogEntryIndexAtTime(
          logEntryHighlights[0].entries,
          visibleMidpoint
        );
        let previousIndex = null;
        let nextIndex = null;
        if (currentHighlightIndexOfMidpoint) {
          previousIndex =
            currentHighlightIndexOfMidpoint > 0
              ? currentHighlightIndexOfMidpoint - 1
              : logEntryHighlights[0].entries.length - 1;
          nextIndex =
            currentHighlightIndexOfMidpoint < logEntryHighlights[0].entries.length - 1
              ? currentHighlightIndexOfMidpoint + 1
              : 0;
        } else {
          // Where this entry would be inserted to maintain sort order
          const insertionIndex = getLogEntryIndexBeforeTime(
            logEntryHighlights[0].entries,
            visibleMidpoint
          );
          previousIndex =
            insertionIndex - 1 > 0 ? insertionIndex - 1 : logEntryHighlights[0].entries.length - 1;
          nextIndex =
            insertionIndex + 1 < logEntryHighlights[0].entries.length - 1 ? insertionIndex + 1 : 0;
        }

        if (previousIndex) {
          setPreviousHighlightLogEntryIndex(previousIndex);
        } else {
          setPreviousHighlightLogEntryIndex(null);
        }

        if (nextIndex) {
          setNextHighlightLogEntryIndex(nextIndex);
        } else {
          setNextHighlightLogEntryIndex(null);
        }

        // console.log(previousIndex, nextIndex, getLogEntryIndexAtTime(logEntryHighlights[0].entries, visibleMidpoint))
      } else {
        setPreviousHighlightLogEntryIndex(null);
        setNextHighlightLogEntryIndex(null);
      }
    },
    [visibleMidpoint, logEntryHighlights]
  );

  const goToPreviousHighlight = useCallback(
    () => {
      const entry = logEntryHighlights[0].entries[previousHighlightLogEntryIndex];
      setTargetHighlightPosition(entry.key);
    },
    [previousHighlightLogEntryIndex, logEntryHighlights, setTargetHighlightPosition]
  );

  const goToNextHighlight = useCallback(
    () => {
      const entry = logEntryHighlights[0].entries[nextHighlightLogEntryIndex];
      setTargetHighlightPosition(entry.key);
    },
    [nextHighlightLogEntryIndex, logEntryHighlights, setTargetHighlightPosition]
  );

  const [loadLogEntryHighlightsRequest, loadLogEntryHighlights] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        if (!apolloClient) {
          throw new DependencyError('Failed to load source: No apollo client available.');
        }
        if (!startKey || !endKey || !highlightTerms.length) {
          throw new Error();
        }

        return await apolloClient.query<
          LogEntryHighlightsQuery.Query,
          LogEntryHighlightsQuery.Variables
        >({
          fetchPolicy: 'no-cache',
          query: logEntryHighlightsQuery,
          variables: {
            sourceId,
            startKey: getPreviousTimeKey(startKey), // interval boundaries are exclusive
            endKey: getNextTimeKey(endKey), // interval boundaries are exclusive
            filterQuery,
            highlights: [
              {
                query: JSON.stringify({
                  multi_match: { query: highlightTerms[0], type: 'phrase', lenient: true },
                }),
              },
            ],
          },
        });
      },
      onResolve: response => {
        setLogEntryHighlights(response.data.source.logEntryHighlights);
      },
    },
    [apolloClient, sourceId, startKey, endKey, filterQuery, highlightTerms]
  );

  useEffect(
    () => {
      if (
        highlightTerms.filter(highlightTerm => highlightTerm.length > 0).length &&
        startKey &&
        endKey
      ) {
        loadLogEntryHighlights();
      } else {
        setLogEntryHighlights(undefined);
      }
    },
    [highlightTerms, startKey, endKey, filterQuery, sourceVersion]
  );

  const logEntryHighlightsById = useMemo(
    () =>
      logEntryHighlights
        ? logEntryHighlights.reduce<LogEntryHighlightsMap>(
            (accumulatedLogEntryHighlightsById, { entries }) => {
              return entries.reduce<LogEntryHighlightsMap>(
                (singleHighlightLogEntriesById, entry) => {
                  const highlightsForId = singleHighlightLogEntriesById[entry.gid] || [];
                  return {
                    ...singleHighlightLogEntriesById,
                    [entry.gid]: [...highlightsForId, entry],
                  };
                },
                accumulatedLogEntryHighlightsById
              );
            },
            {}
          )
        : {},
    [logEntryHighlights]
  );

  return {
    highlightTerms,
    setHighlightTerms,
    setStartKey,
    setEndKey,
    setFilterQuery,
    logEntryHighlights,
    logEntryHighlightsById,
    loadLogEntryHighlightsRequest,
    setVisibleMidpoint,
    previousHighlightLogEntryIndex,
    nextHighlightLogEntryIndex,
    goToPreviousHighlight,
    goToNextHighlight,
    targetHighlightPosition,
  };
};

export const LogHighlightsState = createContainer(useLogHighlightsState);
