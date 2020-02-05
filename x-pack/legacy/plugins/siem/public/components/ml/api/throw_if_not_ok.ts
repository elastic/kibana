/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { has } from 'lodash/fp';

import * as i18n from './translations';
import { MlError } from '../types';
import { SetupMlResponse } from '../../ml_popover/types';

export { MessageBody, parseJsonFromBody } from '../../../utils/api';

export interface MlStartJobError {
  error: MlError;
  started: boolean;
}

export type ToasterErrorsType = Error & {
  messages: string[];
};

export class ToasterErrors extends Error implements ToasterErrorsType {
  public messages: string[];

  constructor(messages: string[]) {
    super(messages[0]);
    this.name = 'ToasterErrors';
    this.messages = messages;
  }
}

export const tryParseResponse = (response: string): string => {
  try {
    return JSON.stringify(JSON.parse(response), null, 2);
  } catch (error) {
    return response;
  }
};

export const throwIfErrorAttachedToSetup = (
  setupResponse: SetupMlResponse,
  jobIdErrorFilter: string[] = []
): void => {
  const jobErrors = setupResponse.jobs.reduce<string[]>(
    (accum, job) =>
      job.error != null && jobIdErrorFilter.includes(job.id)
        ? [
            ...accum,
            job.error.msg,
            tryParseResponse(job.error.response),
            `${i18n.STATUS_CODE} ${job.error.statusCode}`,
          ]
        : accum,
    []
  );

  const dataFeedErrors = setupResponse.datafeeds.reduce<string[]>(
    (accum, dataFeed) =>
      dataFeed.error != null && jobIdErrorFilter.includes(dataFeed.id.substr('datafeed-'.length))
        ? [
            ...accum,
            dataFeed.error.msg,
            tryParseResponse(dataFeed.error.response),
            `${i18n.STATUS_CODE} ${dataFeed.error.statusCode}`,
          ]
        : accum,
    []
  );

  const errors = [...jobErrors, ...dataFeedErrors];
  if (errors.length > 0) {
    throw new ToasterErrors(errors);
  }
};

export const throwIfErrorAttached = (
  json: Record<string, Record<string, unknown>>,
  dataFeedIds: string[]
): void => {
  const errors = dataFeedIds.reduce<string[]>((accum, dataFeedId) => {
    const dataFeed = json[dataFeedId];
    if (isMlStartJobError(dataFeed)) {
      return [
        ...accum,
        dataFeed.error.msg,
        tryParseResponse(dataFeed.error.response),
        `${i18n.STATUS_CODE} ${dataFeed.error.statusCode}`,
      ];
    } else {
      return accum;
    }
  }, []);
  if (errors.length > 0) {
    throw new ToasterErrors(errors);
  }
};

// use the "in operator" and regular type guards to do a narrow once this issue is fixed below:
// https://github.com/microsoft/TypeScript/issues/21732
// Otherwise for now, has will work ok even though it casts 'unknown' to 'any'
export const isMlStartJobError = (value: unknown): value is MlStartJobError =>
  has('error.msg', value) && has('error.response', value) && has('error.statusCode', value);
