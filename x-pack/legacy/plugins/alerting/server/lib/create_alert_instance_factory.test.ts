/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { AlertInstance } from './alert_instance';
import { createAlertInstanceFactory } from './create_alert_instance_factory';

let clock: sinon.SinonFakeTimers;

beforeAll(() => {
  clock = sinon.useFakeTimers();
});
beforeEach(() => clock.reset());
afterAll(() => clock.restore());

test('creates new instances for ones not passed in', () => {
  const alertInstanceFactory = createAlertInstanceFactory({});
  const result = alertInstanceFactory('1');
  expect(result).toMatchInlineSnapshot(`
            Object {
              "meta": Object {},
              "state": Object {},
            }
      `);
});

test('reuses existing instances', () => {
  const alertInstance = new AlertInstance({
    state: { foo: true },
    meta: { lastScheduledActions: { group: 'default', date: new Date() } },
  });
  const alertInstanceFactory = createAlertInstanceFactory({
    '1': alertInstance,
  });
  const result = alertInstanceFactory('1');
  expect(result).toMatchInlineSnapshot(`
    Object {
      "meta": Object {
        "lastScheduledActions": Object {
          "date": 1970-01-01T00:00:00.000Z,
          "group": "default",
        },
      },
      "state": Object {
        "foo": true,
      },
    }
  `);
});

test('mutates given instances', () => {
  const alertInstances = {};
  const alertInstanceFactory = createAlertInstanceFactory(alertInstances);
  alertInstanceFactory('1');
  expect(alertInstances).toMatchInlineSnapshot(`
            Object {
              "1": Object {
                "meta": Object {},
                "state": Object {},
              },
            }
      `);
});
