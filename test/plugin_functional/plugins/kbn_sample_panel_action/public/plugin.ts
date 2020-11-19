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

import { CoreSetup, Plugin } from 'kibana/public';
import { UiActionsSetup } from '../../../../../src/plugins/ui_actions/public';
import { CONTEXT_MENU_TRIGGER } from '../../../../../src/plugins/embeddable/public';
import { createSamplePanelAction } from './sample_panel_action';
import { createSamplePanelLink } from './sample_panel_link';

export class SampelPanelActionTestPlugin
  implements Plugin<SampelPanelActionTestPluginSetup, SampelPanelActionTestPluginStart> {
  public setup(core: CoreSetup, { uiActions }: { uiActions: UiActionsSetup }) {
    const samplePanelAction = createSamplePanelAction(core.getStartServices);
    const samplePanelLink = createSamplePanelLink();

    uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, samplePanelAction);
    uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, samplePanelLink);

    return {};
  }

  public start() {}
  public stop() {}
}

export type SampelPanelActionTestPluginSetup = ReturnType<SampelPanelActionTestPlugin['setup']>;
export type SampelPanelActionTestPluginStart = ReturnType<SampelPanelActionTestPlugin['start']>;
