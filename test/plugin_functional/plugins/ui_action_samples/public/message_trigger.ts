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

import { ITrigger } from 'src/plugins/ui_actions/public';
import { PREVIEW_MESSAGE_ACTION } from './preview_message_action';

export const MESSAGE_TRIGGER = 'MESSAGE_TRIGGER';

export const messageTrigger: ITrigger = {
  id: MESSAGE_TRIGGER,
  /**
   * You can pass in default actions that should be attached to this trigger in here,
   * or you can do
   * ```
   *  deps.uiActions.attachAction(MESSAGE_TRIGGER, PREVIEW_MESSAGE_ACTION);
   * ```
   * in your plugin's setup method.
   */
  actionIds: [PREVIEW_MESSAGE_ACTION],
};
