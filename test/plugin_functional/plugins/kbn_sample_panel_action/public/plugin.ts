/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, Plugin } from '@kbn/core/public';
import { UiActionsSetup } from '@kbn/ui-actions-plugin/public';
import { CONTEXT_MENU_TRIGGER } from '@kbn/embeddable-plugin/public';
import { createSamplePanelAction } from './sample_panel_action';
import { createSamplePanelLink } from './sample_panel_link';

export class SampelPanelActionTestPlugin
  implements Plugin<SampelPanelActionTestPluginSetup, SampelPanelActionTestPluginStart>
{
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
