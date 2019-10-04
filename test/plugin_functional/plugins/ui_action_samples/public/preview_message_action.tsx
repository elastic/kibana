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

import { CoreStart } from 'kibana/public';
import {
  IAction,
  createAction,
  IncompatibleActionError,
} from '../../../../../src/plugins/ui_actions/public';
import { IMessage } from './types';

export const PREVIEW_MESSAGE_ACTION = 'PREVIEW_MESSAGE_ACTION';

async function isCompatible(context: IMessage) {
  return context.to !== undefined && context.from !== undefined && context.message !== undefined;
}

export function createPreviewMessageAction(
  openModal: CoreStart['overlays']['openModal']
): IAction<IMessage> {
  return createAction<IMessage>({
    type: PREVIEW_MESSAGE_ACTION,
    id: PREVIEW_MESSAGE_ACTION,
    getDisplayName: () => 'Preview message',
    isCompatible,
    execute: async message => {
      if (!(await isCompatible(message))) {
        throw new IncompatibleActionError();
      }

      openModal(<PreviewMessageModal message={message} />);
    },
  });
}
