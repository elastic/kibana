/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { readSignals } from './read_signals';
import { DeleteSignalParams } from './types';

export const deleteSignals = async ({
  alertsClient,
  actionsClient, // TODO: Use this when we have actions such as email, etc...
  id,
  ruleId,
}: DeleteSignalParams) => {
  const signal = await readSignals({ alertsClient, id, ruleId });
  if (signal == null) {
    return null;
  }

  if (ruleId != null) {
    await alertsClient.delete({ id: signal.id });
    return signal;
  } else if (id != null) {
    try {
      await alertsClient.delete({ id });
      return signal;
    } catch (err) {
      if (err.output.statusCode === 404) {
        return null;
      } else {
        throw err;
      }
    }
  } else {
    return null;
  }
};
