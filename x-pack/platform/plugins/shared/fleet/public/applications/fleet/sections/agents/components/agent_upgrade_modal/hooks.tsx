/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState, useMemo } from 'react';
import moment from 'moment';

export function useScheduleDateTime(now?: string) {
  const initialDatetime = useMemo(() => moment(now), [now]);
  const [startDatetime, setStartDatetime] = useState<moment.Moment>(initialDatetime);
  const minTime = useMemo(() => {
    if (startDatetime.isSame(initialDatetime, 'day')) {
      return initialDatetime.clone();
    }
  }, [startDatetime, initialDatetime]);
  const maxTime = useMemo(() => {
    if (startDatetime.isSame(initialDatetime, 'day')) {
      return initialDatetime.clone().endOf('day');
    }
  }, [startDatetime, initialDatetime]);

  const onChangeStartDateTime = useCallback(
    (date: moment.Moment | null) => {
      if (!date) {
        return;
      }

      if (date.isBefore(initialDatetime)) {
        setStartDatetime(initialDatetime);
      } else {
        setStartDatetime(date);
      }
    },
    [initialDatetime]
  );

  return {
    startDatetime,
    initialDatetime,
    onChangeStartDateTime,
    minTime,
    maxTime,
  };
}
