/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { has } from 'lodash/fp';

import * as i18n from './translations';
import { MlError } from '../types';
import { SetupMlResponse } from '../../ml_popover/types';

export interface MessageBody {
  error?: string;
  message?: string;
  statusCode?: number;
}

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

export const throwIfNotOk = async (response: Response): Promise<void> => {
  if (!response.ok) {
    const body = await parseJsonFromBody(response);
    if (body != null && body.message) {
      if (body.statusCode != null) {
        throw new ToasterErrors([body.message, `${i18n.STATUS_CODE} ${body.statusCode}`]);
      } else {
        throw new ToasterErrors([body.message]);
      }
    } else {
      throw new ToasterErrors([`${i18n.NETWORK_ERROR} ${response.statusText}`]);
    }
  }
};

export const parseJsonFromBody = async (response: Response): Promise<MessageBody | null> => {
  try {
    const text = await response.text();
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
};

export const tryParseResponse = (response: string): string => {
  try {
    return JSON.stringify(JSON.parse(response), null, 2);
  } catch (error) {
    return response;
  }
};

export const throwIfErrorAttachedToSetup = (setupResponse: SetupMlResponse): void => {
  const jobErrors = setupResponse.jobs.reduce<string[]>((accum, job) => {
    if (job.error != null) {
      return [
        ...accum,
        job.error.msg,
        tryParseResponse(job.error.response),
        `${i18n.STATUS_CODE} ${job.error.statusCode}`,
      ];
    } else {
      return accum;
    }
  }, []);

  const dataFeedErrors = setupResponse.datafeeds.reduce<string[]>((accum, dataFeed) => {
    if (dataFeed.error != null) {
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
