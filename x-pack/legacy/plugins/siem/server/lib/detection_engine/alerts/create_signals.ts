/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SIGNALS_ID } from '../../../../common/constants';
import { updateSignal } from './update_signals';
import { SignalParams } from './types';

// TODO: This updateIfIdExists should be temporary and we will remove it once we can POST id's directly to
// the alerting framework.
export const updateIfIdExists = async ({
  alertsClient,
  actionsClient,
  description,
  enabled,
  filter,
  from,
  query,
  language,
  savedId,
  filters,
  id,
  index,
  interval,
  maxSignals,
  name,
  severity,
  size,
  to,
  type,
  references,
}: SignalParams) => {
  try {
    const signal = await updateSignal({
      alertsClient,
      actionsClient,
      description,
      enabled,
      filter,
      from,
      query,
      language,
      savedId,
      filters,
      id,
      index,
      interval,
      maxSignals,
      name,
      severity,
      size,
      to,
      type,
      references,
    });
    return signal;
  } catch (err) {
    if (err.output.statusCode === 404) {
      return null;
    } else {
      return err;
    }
  }
};

export const createSignals = async ({
  alertsClient,
  actionsClient,
  description,
  enabled,
  filter,
  from,
  query,
  language,
  savedId,
  filters,
  id,
  index,
  interval,
  maxSignals,
  name,
  severity,
  size,
  to,
  type,
  references,
}: SignalParams) => {
  // TODO: Once we can post directly to _id we will not have to do this part anymore.
  const signalUpdating = await updateIfIdExists({
    alertsClient,
    actionsClient,
    description,
    enabled,
    filter,
    from,
    query,
    language,
    savedId,
    filters,
    id,
    index,
    interval,
    maxSignals,
    name,
    severity,
    size,
    to,
    type,
    references,
  });
  if (signalUpdating == null) {
    // TODO: Right now we are using the .server-log as the default action as each alert has to have
    // at least one action or it will not be able to do in-memory persistence. When adding in actions
    // such as email, slack, etc... this should be the default action if no action is specified to
    // create signals
    const actionResults = await actionsClient.create({
      action: {
        actionTypeId: '.server-log',
        description: 'SIEM Alerts Log',
        config: {},
        secrets: {},
      },
    });

    return alertsClient.create({
      data: {
        name,
        tags: [],
        alertTypeId: SIGNALS_ID,
        alertTypeParams: {
          description,
          id,
          index,
          from,
          filter,
          query,
          language,
          savedId,
          filters,
          maxSignals,
          severity,
          to,
          type,
          references,
        },
        interval,
        enabled,
        actions: [
          {
            group: 'default',
            id: actionResults.id,
            params: {
              message: 'SIEM Alert Fired',
              level: 'info',
            },
          },
        ],
        throttle: null,
      },
    });
  } else {
    return signalUpdating;
  }
};
