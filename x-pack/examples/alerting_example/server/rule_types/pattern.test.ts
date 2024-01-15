/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { ruleType } from './pattern';

const logger = loggingSystemMock.create().get();

describe('pattern rule type', () => {
  test('throws on bad patterns', async () => {
    const params = {
      patterns: {
        instA: ' a nope - ',
        instB: ' hallo! ',
      },
    };
    const state = {};
    const options = {
      params,
      state,
      services: { alertsClient: {} },
    };
    try {
      await ruleType.executor(options as any);
    } catch (err) {
      expect(err.message).toMatchInlineSnapshot(
        `"errors in patterns: pattern for instA contains invalid string: \\"nope\\", pattern for instB contains invalid string: \\"hallo!\\""`
      );
    }
  });

  test('works as expected', async () => {
    const params = {
      patterns: {
        instA: ' a - a ',
        instB: ' - a ',
      },
    };
    const state = {};
    const services = getServices();
    const options = {
      logger,
      params,
      state,
      services,
    };

    let result: any;
    for (let i = 0; i < 6; i++) {
      result = await ruleType.executor(options as any);
      options.state = result.state;
    }

    expect(services.scheduledActions).toMatchInlineSnapshot(`
      Array [
        Array [
          "instA",
          "default",
          Object {
            "action": "a",
            "pattern": Array [
              "a",
              "-",
              "a",
            ],
            "patternIndex": 0,
            "runs": 1,
          },
        ],
        Array [
          "instB",
          "default",
          Object {
            "action": "a",
            "pattern": Array [
              "-",
              "a",
            ],
            "patternIndex": 1,
            "runs": 2,
          },
        ],
        Array [
          "instA",
          "default",
          Object {
            "action": "a",
            "pattern": Array [
              "a",
              "-",
              "a",
            ],
            "patternIndex": 2,
            "runs": 3,
          },
        ],
        Array [
          "instA",
          "default",
          Object {
            "action": "a",
            "pattern": Array [
              "a",
              "-",
              "a",
            ],
            "patternIndex": 0,
            "runs": 4,
          },
        ],
        Array [
          "instB",
          "default",
          Object {
            "action": "a",
            "pattern": Array [
              "-",
              "a",
            ],
            "patternIndex": 1,
            "runs": 4,
          },
        ],
        Array [
          "instA",
          "default",
          Object {
            "action": "a",
            "pattern": Array [
              "a",
              "-",
              "a",
            ],
            "patternIndex": 2,
            "runs": 6,
          },
        ],
        Array [
          "instB",
          "default",
          Object {
            "action": "a",
            "pattern": Array [
              "-",
              "a",
            ],
            "patternIndex": 1,
            "runs": 6,
          },
        ],
      ]
    `);

    expect(result.state).toMatchInlineSnapshot(`
      Object {
        "patternParamJSON": "{\\"instA\\":\\" a - a \\",\\"instB\\":\\" - a \\"}",
        "patterns": Array [
          Object {
            "instance": "instA",
            "pattern": Array [
              "a",
              "-",
              "a",
            ],
            "patternIndex": 0,
          },
          Object {
            "instance": "instB",
            "pattern": Array [
              "-",
              "a",
            ],
            "patternIndex": 0,
          },
        ],
        "runs": 6,
      }
    `);
  });
});

type ScheduledAction = [string, string, any];
function getServices() {
  const scheduledActions: ScheduledAction[] = [];

  return {
    scheduledActions,
    alertsClient: {
      report(reported: { id: string; actionGroup: string; context: any }) {
        scheduledActions.push([reported.id, reported.actionGroup, reported.context]);
      },
    },
  };
}
