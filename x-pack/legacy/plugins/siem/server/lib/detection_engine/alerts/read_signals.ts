/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { findSignals } from './find_signals';
import { SignalAlertType, isAlertTypeArray, ReadSignalParams } from './types';

export const findSignalInArrayById = (objects: object[], id: string): SignalAlertType | null => {
  if (isAlertTypeArray(objects)) {
    const signals: SignalAlertType[] = objects;
    const signal: SignalAlertType[] = signals.filter(datum => {
      return datum.alertTypeParams.id === id;
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
}: ReadSignalParams): Promise<SignalAlertType | null> => {
  const firstSignals = await findSignals({ alertsClient, page: 1 });
  const firstSignal = findSignalInArrayById(firstSignals.data, id);
  if (firstSignal != null) {
    return firstSignal;
  } else {
    const totalPages = Math.ceil(firstSignals.total / firstSignals.perPage);
    return Array(totalPages)
      .fill({})
      .map((_, page) => {
        // page index never starts at zero. It always has to be 1 or greater
        return findSignals({ alertsClient, page: page + 1 });
      })
      .reduce<Promise<SignalAlertType | null>>(async (accum, findSignal) => {
        const signals = await findSignal;
        const signal = findSignalInArrayById(signals.data, id);
        if (signal != null) {
          return signal;
        } else {
          return accum;
        }
      }, Promise.resolve(null));
  }
};

export const readSignals = async ({ alertsClient, id }: ReadSignalParams) => {
  const signalById = await readSignalById({ alertsClient, id });
  if (signalById != null) {
    return signalById;
  } else {
    return alertsClient.get({ id });
  }
};
