/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertTimestamp } from '../lib/convert_timestamp';
import { api as commonApi } from '../lib/servicenow/api';
import {
  ExecutorSubActionAddEventParams,
  AddEventApiHandlerArgs,
  ExternalServiceApiITOM,
} from '../lib/servicenow/types';

const isValidDate = (d: Date) => !isNaN(d.valueOf());

const formatTimeOfEvent = (timeOfEvent: string | null): string | undefined => {
  const convertedTimestamp = convertTimestamp(timeOfEvent);
  if (convertedTimestamp != null) {
    const date = new Date(convertedTimestamp);

    return isValidDate(date)
      ? // The format is: yyyy-MM-dd HH:mm:ss GMT
        date.toLocaleDateString('eo', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          hour12: false,
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'GMT',
        })
      : undefined;
  }
};

const removeNullValues = (
  params: ExecutorSubActionAddEventParams
): ExecutorSubActionAddEventParams =>
  (Object.keys(params) as Array<keyof ExecutorSubActionAddEventParams>).reduce(
    (acc, key) => ({
      ...acc,
      ...(params[key] != null ? { [key]: params[key] } : {}),
    }),
    {} as ExecutorSubActionAddEventParams
  );

export const prepareParams = (
  params: ExecutorSubActionAddEventParams
): ExecutorSubActionAddEventParams => {
  const timeOfEvent = formatTimeOfEvent(params.time_of_event);
  return removeNullValues({
    ...params,
    time_of_event: timeOfEvent ?? null,
  });
};

const addEventServiceHandler = async ({
  externalService,
  params,
}: AddEventApiHandlerArgs): Promise<void> => {
  const itomExternalService = externalService;
  const preparedParams = prepareParams(params);
  await itomExternalService.addEvent(preparedParams);
};

export const api: ExternalServiceApiITOM = {
  getChoices: commonApi.getChoices,
  addEvent: addEventServiceHandler,
};
