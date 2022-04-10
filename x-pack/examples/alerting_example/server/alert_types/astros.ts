/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { RuleType } from '../../../../plugins/alerting/server';
import { Operator, Craft, ALERTING_EXAMPLE_APP_ID } from '../../common/constants';

interface PeopleInSpace {
  people: Array<{
    craft: string;
    name: string;
  }>;
  number: number;
}

function getOperator(op: string) {
  switch (op) {
    case Operator.AreAbove:
      return (left: number, right: number) => left > right;
    case Operator.AreBelow:
      return (left: number, right: number) => left < right;
    case Operator.AreExactly:
      return (left: number, right: number) => left === right;
    default:
      return () => {
        throw new Error(
          `Invalid Operator "${op}" [${Operator.AreAbove},${Operator.AreBelow},${Operator.AreExactly}]`
        );
      };
  }
}

function getCraftFilter(craft: string) {
  return (person: { craft: string; name: string }) =>
    craft === Craft.OuterSpace ? true : craft === person.craft;
}

export const alertType: RuleType<
  { outerSpaceCapacity: number; craft: string; op: string },
  never,
  { peopleInSpace: number },
  { craft: string },
  never,
  'default',
  'hasLandedBackOnEarth'
> = {
  id: 'example.people-in-space',
  name: 'People In Space Right Now',
  actionGroups: [{ id: 'default', name: 'default' }],
  minimumLicenseRequired: 'basic',
  isExportable: true,
  defaultActionGroupId: 'default',
  recoveryActionGroup: {
    id: 'hasLandedBackOnEarth',
    name: 'Has landed back on Earth',
  },
  async executor({ services, params }) {
    const { outerSpaceCapacity, craft: craftToTriggerBy, op } = params;

    // add artificial timeout
    await new Promise((r) => setTimeout(r, 240000));

    const response = await axios.get<PeopleInSpace>('http://api.open-notify.org/astros.json');
    const {
      data: { number: peopleInSpace, people = [] },
    } = response;

    const peopleInCraft = people.filter(getCraftFilter(craftToTriggerBy));

    if (getOperator(op)(peopleInCraft.length, outerSpaceCapacity)) {
      peopleInCraft.forEach(({ craft, name }) => {
        services.alertFactory.create(name).replaceState({ craft }).scheduleActions('default');
      });
    }

    return {
      peopleInSpace,
    };
  },
  producer: ALERTING_EXAMPLE_APP_ID,
};
