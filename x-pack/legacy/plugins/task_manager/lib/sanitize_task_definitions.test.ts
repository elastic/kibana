/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { RunContext } from '../task';
import { sanitizeTaskDefinitions } from './sanitize_task_definitions';

interface Opts {
  numTasks: number;
}

const getMockTaskDefinitions = (opts: Opts) => {
  const { numTasks } = opts;
  const tasks: any = {};

  for (let i = 0; i < numTasks; i++) {
    const type = `test_task_type_${i}`;
    tasks[type] = {
      type,
      title: 'Test',
      description: 'one super cool task',
      createTaskRunner(context: RunContext) {
        const incre = get(context, 'taskInstance.state.incre', -1);
        return {
          run: () => ({
            state: {
              incre: incre + 1,
            },
            runAt: Date.now(),
          }),
        };
      },
    };
  }
  return tasks;
};

describe('sanitizeTaskDefinitions', () => {
  it('provides tasks with defaults', () => {
    const taskDefinitions = getMockTaskDefinitions({ numTasks: 3 });
    const result = sanitizeTaskDefinitions(taskDefinitions);

    expect(result).toMatchInlineSnapshot(`
Object {
  "test_task_type_0": Object {
    "createTaskRunner": [Function],
    "description": "one super cool task",
    "timeout": "5m",
    "title": "Test",
    "type": "test_task_type_0",
  },
  "test_task_type_1": Object {
    "createTaskRunner": [Function],
    "description": "one super cool task",
    "timeout": "5m",
    "title": "Test",
    "type": "test_task_type_1",
  },
  "test_task_type_2": Object {
    "createTaskRunner": [Function],
    "description": "one super cool task",
    "timeout": "5m",
    "title": "Test",
    "type": "test_task_type_2",
  },
}
`);
  });

  it('throws a validation exception for invalid task definition', () => {
    const runsanitize = () => {
      const taskDefinitions = {
        some_kind_of_task: {
          fail: 'extremely', // cause a validation failure
          type: 'breaky_task',
          title: 'Test XYZ',
          description: `Actually this won't work`,
          createTaskRunner() {
            return {
              async run() {
                return {
                  state: {},
                };
              },
            };
          },
        },
      };

      return sanitizeTaskDefinitions(taskDefinitions);
    };

    expect(runsanitize).toThrowError();
  });
});
