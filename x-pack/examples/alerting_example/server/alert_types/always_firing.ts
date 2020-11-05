/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { range } from 'lodash';
import { AlertType } from '../../../../plugins/alerts/server';
import { DEFAULT_INSTANCES_TO_GENERATE, ALERTING_EXAMPLE_APP_ID } from '../../common/constants';

export const alertType: AlertType = {
  id: 'example.always-firing',
  name: 'Always firing',
  actionGroups: [{ id: 'default', name: 'default' }],
  defaultActionGroupId: 'default',
  async executor({ services, params: { instances = DEFAULT_INSTANCES_TO_GENERATE }, state }) {
    const count = (state.count ?? 0) + 1;

    range(instances)
      .map(() => ({ id: uuid.v4() }))
      .forEach((instance: { id: string }) => {
        services
          .alertInstanceFactory(instance.id)
          .replaceState({ triggerdOnCycle: count })
          .scheduleActions('default');
      });

    return {
      count,
    };
  },
  producer: ALERTING_EXAMPLE_APP_ID,
};
