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

import { Action, actionRegistry, triggerRegistry } from 'plugins/embeddable_api/index';

import { EuiFlyout } from '@elastic/eui';
import { CONTEXT_MENU_TRIGGER } from 'plugins/embeddable_api/index';
import React from 'react';

import { getNewPlatform } from 'ui/new_platform';
import { FlyoutRef } from '../../../../../../src/core/public';

const HELLO_WORLD_ACTION_ID = 'HELLO_WORLD_ACTION_ID';

export class HelloWorldAction extends Action {
  private flyoutSession: FlyoutRef | undefined;
  constructor() {
    super(HELLO_WORLD_ACTION_ID);
  }

  public getTitle() {
    return 'Hello World!';
  }

  public execute() {
    this.flyoutSession = getNewPlatform().setup.core.overlays.openFlyout(
      <EuiFlyout ownFocus onClose={() => this.flyoutSession && this.flyoutSession.close()}>
        Hello World!
      </EuiFlyout>,
      {
        'data-test-subj': 'helloWorldAction',
      }
    );
  }
}

actionRegistry.addAction(new HelloWorldAction());

triggerRegistry.attachAction({
  triggerId: CONTEXT_MENU_TRIGGER,
  actionId: HELLO_WORLD_ACTION_ID,
});
