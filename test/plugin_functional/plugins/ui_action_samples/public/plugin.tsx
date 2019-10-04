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
import React from 'react';
import { Plugin, CoreSetup, CoreStart } from 'kibana/public';
import { IUiActionsSetup, IUiActionsApi } from '../../../../../src/plugins/ui_actions/public';
import { messageTrigger, MESSAGE_TRIGGER } from './message_trigger';
import { IMessage } from './types';
import { createPreviewMessageAction } from './preview_message_action';

interface ISearchExplorerSetupDependencies {
  uiActions: IUiActionsSetup;
}

export interface UiActionSamplesAppMountContext {
  SendMessageForm: JSX.Element;
}

declare module 'kibana/public' {
  interface AppMountContext {
    uiActionSamples?: UiActionSamplesAppMountContext;
    uiActions?: IUiActionsApi;
  }
}

interface IUiActionSamplesSetup {}

export class ActionExplorerPlugin
  implements
    Plugin<
      IUiActionSamplesSetup,
      void,
      ISearchExplorerSetupDependencies,
      ISearchExplorerSetupDependencies
    > {
  public setup(core: CoreSetup, deps: ISearchExplorerSetupDependencies) {
    // Provide a send message form to users that is hooked up to our trigger.
    core.application.registerMountContext<'actionSamples'>('actionSamples', async context => {
      const { SendMessageForm } = await import('./send_message_form');
      const onSend = (message: IMessage) => {
        if (!context.uiActions) {
          throw new Error('uiActions is undefined');
        }
        context.uiActions.executeTriggerActions(MESSAGE_TRIGGER, message);
      };
      return {
        SendMessageForm: <SendMessageForm onSend={onSend} />,
      };
    });
  }

  public start(core: CoreStart, deps: ISearchExplorerSetupDependencies) {
    deps.uiActions.registerAction(createPreviewMessageAction(core.overlays.openModal));
    deps.uiActions.registerTrigger(messageTrigger);
  }

  public stop() {}
}
