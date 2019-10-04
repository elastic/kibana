/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
  IAction,
  createAction,
  IncompatibleActionError,
} from '../../../../../src/plugins/ui_actions/public';

export const HELLO_WORLD_ACTION = 'HELLO_WORLD_ACTION';

interface ActionContext {
  name: string;
}

async function isCompatible(context: ActionContext) {
  return context.name !== undefined;
}

export function createHelloWorldAction(openModal: OpenModal): IAction<ActionContext> {
  return createAction<ActionContext>({
    type: HELLO_WORLD_ACTION,
    id: HELLO_WORLD_ACTION,
    getDisplayName: () => 'Say hello to me!',
    isCompatible,
    execute: async context => {
      if (!(await isCompatible(context))) {
        throw new IncompatibleActionError();
      }
    },
  });
}
