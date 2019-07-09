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
  actionRegistry,
  attachAction,
  CONTEXT_MENU_TRIGGER,
  triggerRegistry,
} from 'plugins/embeddable_api';
import { EditModeAction } from '../../../../../../src/legacy/core_plugins/embeddable_api/public/test_samples';

const editModeAction = new EditModeAction();
actionRegistry.set(editModeAction.id, editModeAction);
attachAction(triggerRegistry, {
  triggerId: CONTEXT_MENU_TRIGGER,
  actionId: editModeAction.id,
});
