/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertsClient } from '../../../../../alerting/server/alerts_client';
import { findSignals } from './find_signals';
import { SignalAlertType, isAlertTypeArray } from './types';

export interface ReadSignalParams {
  alertsClient: AlertsClient;
  id: string;
}

export interface ReadSignalByIdParams {
  alertsClient: AlertsClient;
  id: string;
}

export const findSignalInArrayById = (objects: object[], id: string): SignalAlertType | null => {
  if (isAlertTypeArray(objects)) {
    const signals: SignalAlertType[] = objects;
    const signal: SignalAlertType[] = signals.filter(datum => {
      // TODO: Change String(datum.alertTypeParams.id) below once the data type is a string
      // in the alert params schema
      return String(datum.alertTypeParams.id) === id;
    });
    if (signal.length !== 0) {
      return signal[0];
    } else {
      return null;
    }
  } else {
    return null;
  }
};

// This an extremely slow and inefficient way of getting a signal by its id.
// I have to manually query every single record since the Signal Params are
// not indexed and I cannot push in my own _id when I create an alert at the moment.
// TODO: Once we can directly push in the _id, then we should no longer need this way.
// TODO: This is meant to be _very_ temporary.
export const readSignalById = async ({
  alertsClient,
  id,
}: ReadSignalByIdParams): Promise<SignalAlertType | null> => {
  let length: number = 0;
  let page: number = 1;
  do {
    const signals = await findSignals({ alertsClient, page });
    const signal = findSignalInArrayById(signals.data, id);
    if (signal != null) {
      return signal;
    } else {
      length = signals.data.length;
      page++;
    }
  } while (length !== 0);
  return null;
};

export const readSignals = async ({ alertsClient, id }: ReadSignalParams) => {
  const signalById = await readSignalById({ alertsClient, id });
  if (signalById != null) {
    return signalById;
  } else {
    return alertsClient.get({ id });
  }
};
