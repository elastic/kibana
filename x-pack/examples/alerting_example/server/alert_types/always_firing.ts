/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { range, random, pick } from 'lodash';
import { AlertType } from '../../../../plugins/alerts/server';
import { DEFAULT_INSTANCES_TO_GENERATE, ALERTING_EXAMPLE_APP_ID } from '../../common/constants';

const ACTION_GROUPS = [
  { id: 'small', name: 'small', tshirtSize: 1 },
  { id: 'medium', name: 'medium', tshirtSize: 2 },
  { id: 'large', name: 'large', tshirtSize: 3 },
];

export const alertType: AlertType = {
  id: 'example.always-firing',
  name: 'Always firing',
  actionGroups: ACTION_GROUPS.map((actionGroup) => pick(actionGroup, ['id', 'name'])),
  defaultActionGroupId: 'small',
  async executor({ services, params: { instances = DEFAULT_INSTANCES_TO_GENERATE }, state }) {
    const count = (state.count ?? 0) + 1;

    range(instances)
      .map(() => ({ id: uuid.v4(), tshirtSize: random(1, 3) }))
      .forEach((instance: { id: string; tshirtSize: number }) => {
        services
          .alertInstanceFactory(instance.id)
          .replaceState({ triggerdOnCycle: count })
          .scheduleActions(
            ACTION_GROUPS.find((actionGroup) => actionGroup.tshirtSize === instance.tshirtSize)!.id
          );
      });

    return {
      count,
    };
  },
  producer: ALERTING_EXAMPLE_APP_ID,
};
