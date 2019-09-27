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
import { npStart } from 'ui/new_platform';
import { IAction, createAction } from '../../../../../src/plugins/ui_actions/public';
import { CONTEXT_MENU_TRIGGER } from '../../../../../src/plugins/embeddable/public';

export const createSamplePanelLink = (): IAction =>
  createAction({
    type: 'samplePanelLink',
    getDisplayName: () => 'Sample panel Link',
    execute: async () => {},
    getHref: () => 'https://example.com/kibana/test',
  });

const action = createSamplePanelLink();
npStart.plugins.uiActions.registerAction(action);
npStart.plugins.uiActions.attachAction(CONTEXT_MENU_TRIGGER, action.id);
