/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { range, random } from 'lodash';
import { AlertType } from '../../../../plugins/alerts/server';
import { DEFAULT_INSTANCES_TO_GENERATE, ALERTING_EXAMPLE_APP_ID } from '../../common/constants';

const ACTION_GROUPS = [
  { id: 'small', name: 'small' },
  { id: 'medium', name: 'medium' },
  { id: 'large', name: 'large' },
];

export const alertType: AlertType = {
  id: 'example.always-firing',
  name: 'Always firing',
  actionGroups: ACTION_GROUPS,
  defaultActionGroupId: 'small',
  async executor({ services, params: { instances = DEFAULT_INSTANCES_TO_GENERATE }, state }) {
    const count = (state.count ?? 0) + 1;

    range(instances)
      .map(() => ({ id: uuid.v4(), tshirtSize: ACTION_GROUPS[random(0, 2)].id! }))
      .forEach((instance: { id: string; tshirtSize: string }) => {
        services
          .alertInstanceFactory(instance.id)
          .replaceState({ triggerdOnCycle: count })
          .scheduleActions(instance.tshirtSize);
      });

    return {
      count,
    };
  },
  producer: ALERTING_EXAMPLE_APP_ID,
};
