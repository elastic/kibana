/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import {
  DEFAULT_AAD_CONFIG,
  RuleType,
  RuleTypeParams,
  RuleTypeState,
  AlertsClientError,
} from '@kbn/alerting-plugin/server';
import { schema } from '@kbn/config-schema';
import type { DefaultAlert } from '@kbn/alerts-as-data-utils';
import { Operator, Craft, ALERTING_EXAMPLE_APP_ID } from '../../common/constants';

interface PeopleInSpace {
  people: Array<{
    craft: string;
    name: string;
  }>;
  number: number;
}

interface Params extends RuleTypeParams {
  outerSpaceCapacity: number;
  craft: string;
  op: string;
}
interface State extends RuleTypeState {
  peopleInSpace: number;
}
interface AlertState {
  craft: string;
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

export const ruleType: RuleType<
  Params,
  never,
  State,
  AlertState,
  never,
  'default',
  'hasLandedBackOnEarth',
  DefaultAlert
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
    const { alertsClient } = services;
    if (!alertsClient) {
      throw new AlertsClientError();
    }
    const { outerSpaceCapacity, craft: craftToTriggerBy, op } = params;

    const response = await axios.get<PeopleInSpace>('http://api.open-notify.org/astros.json');
    const {
      data: { number: peopleInSpace, people = [] },
    } = response;

    const peopleInCraft = people.filter(getCraftFilter(craftToTriggerBy));

    if (getOperator(op)(peopleInCraft.length, outerSpaceCapacity)) {
      peopleInCraft.forEach(({ craft, name }) => {
        alertsClient.report({ id: name, actionGroup: 'default', state: { craft } });
      });
    }

    return {
      state: {
        peopleInSpace,
      },
    };
  },
  category: 'example',
  producer: ALERTING_EXAMPLE_APP_ID,
  getViewInAppRelativeUrl({ rule }) {
    return `/app/${ALERTING_EXAMPLE_APP_ID}/astros/${rule.id}`;
  },
  alerts: DEFAULT_AAD_CONFIG,
  validate: {
    params: schema.object({
      outerSpaceCapacity: schema.number(),
      craft: schema.string(),
      op: schema.string(),
    }),
  },
};
