/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { HttpSetup } from '@kbn/core/public';

export interface TaskWithApiKeySandboxProps {
  http: HttpSetup;
}

export const TaskWithApiKeySandbox = (props: TaskWithApiKeySandboxProps) => {
  const { http } = props;
  return (
    <div>
      <div>
        <EuiButton
          onClick={() => {
            http.get('/api/triggers_actions_ui_example/schedule_task_with_api_key/task1');
          }}
        >
          Schedule Task 1
        </EuiButton>
      </div>
      <div>
        <EuiButton
          onClick={() => {
            http.get('/api/triggers_actions_ui_example/schedule_task_with_api_key/task2');
          }}
        >
          Schedule Task 2
        </EuiButton>
      </div>
      <div>
        <EuiButton
          onClick={() => {
            http.get('/api/triggers_actions_ui_example/remove_task_with_api_key/task1');
          }}
        >
          Remove Task 1
        </EuiButton>
        <EuiButton
          onClick={() => {
            http.get('/api/triggers_actions_ui_example/remove_task_with_api_key/task2');
          }}
        >
          Remove Task 2
        </EuiButton>
      </div>
      <div>
        <EuiButton
          onClick={() => {
            http.post('/api/triggers_actions_ui_example/bulk_remove_task_with_api_key', {
              body: JSON.stringify({ ids: ['task1', 'task2'] }),
            });
          }}
        >
          Remove All Tasks
        </EuiButton>
      </div>
    </div>
  );
};
