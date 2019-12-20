/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';

import { updateSignalStatus } from '../../../../containers/detection_engine/signals/api';
import { SendSignalsToTimelineActionProps, UpdateSignalStatusActionProps } from './types';
import { TimelineNonEcsData } from '../../../../graphql/types';

export const getUpdateSignalsQuery = (eventIds: Readonly<string[]>) => {
  return {
    query: {
      bool: {
        filter: {
          terms: {
            _id: [...eventIds],
          },
        },
      },
    },
  };
};

export const getFilterAndRuleBounds = (
  data: TimelineNonEcsData[][]
): [string[], number, number] => {
  const stringFilter = data?.[0].filter(d => d.field === 'signal.rule.filters')?.[0]?.value ?? [];

  const eventTimes = data
    .flatMap(signal => signal.filter(d => d.field === 'signal.original_time')?.[0]?.value ?? [])
    .map(d => moment(d));

  return [stringFilter, moment.min(eventTimes).valueOf(), moment.max(eventTimes).valueOf()];
};

export const updateSignalStatusAction = async ({
  query,
  signalIds,
  status,
  setEventsLoading,
  setEventsDeleted,
  kbnVersion,
}: UpdateSignalStatusActionProps) => {
  try {
    setEventsLoading({ eventIds: signalIds, isLoading: true });

    const queryObject = query ? { query: JSON.parse(query) } : getUpdateSignalsQuery(signalIds);

    await updateSignalStatus({
      query: queryObject,
      status,
      kbnVersion,
    });
    // TODO: Only delete those that were successfully updated from updatedRules
    setEventsDeleted({ eventIds: signalIds, isDeleted: true });
  } catch (e) {
    // TODO: Show error toasts
  } finally {
    setEventsLoading({ eventIds: signalIds, isLoading: false });
  }
};

export const sendSignalsToTimelineAction = async ({
  createTimeline,
  data,
}: SendSignalsToTimelineActionProps) => {
  const stringFilter = data[0].filter(d => d.field === 'signal.rule.filters')?.[0]?.value ?? [];

  // TODO: Switch to using from/to when adding dateRange
  // const [stringFilters, from, to] = getFilterAndRuleBounds(data);
  const parsedFilter = stringFilter.map(sf => JSON.parse(sf));
  createTimeline({
    id: 'timeline-1',
    filters: parsedFilter,
    dateRange: undefined, // TODO
    kqlQuery: undefined, // TODO
  });
};
