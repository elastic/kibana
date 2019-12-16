/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { updateSignalStatus } from '../../../containers/detection_engine/signals/api';
import { SendSignalsToTimelineActionProps, UpdateSignalStatusActionProps } from './types';

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

export const updateSignalStatusAction = async ({
  signalIds,
  status,
  setEventsLoading,
  setEventsDeleted,
  kbnVersion,
}: UpdateSignalStatusActionProps) => {
  try {
    setEventsLoading({ eventIds: signalIds, isLoading: true });

    await updateSignalStatus({
      query: getUpdateSignalsQuery(signalIds),
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
  const stringFilter = data.filter(d => d.field === 'signal.rule.filters')?.[0]?.value ?? [];
  const parsedFilter = stringFilter.map(sf => JSON.parse(sf));
  createTimeline({
    id: 'timeline-1',
    filters: parsedFilter,
    dateRange: undefined, // TODO
    kqlQuery: undefined, // TODO
  });
};
