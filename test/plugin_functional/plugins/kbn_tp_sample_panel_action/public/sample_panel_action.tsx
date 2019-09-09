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
import { EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import React from 'react';
import { npStart } from 'ui/new_platform';

import {
  Action,
  CONTEXT_MENU_TRIGGER,
  IEmbeddable,
} from '../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';
import { setup } from '../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/legacy';

interface ActionContext {
  embeddable: IEmbeddable;
}

class SamplePanelAction extends Action<ActionContext> {
  public readonly type = 'samplePanelAction';

  constructor() {
    super('samplePanelAction');
  }

  public getDisplayName() {
    return 'Sample Panel Action';
  }

  public execute = async ({ embeddable }: ActionContext) => {
    if (!embeddable) {
      return;
    }
    npStart.core.overlays.openFlyout(
      <React.Fragment>
        <EuiFlyoutHeader>
          <EuiTitle size="m" data-test-subj="samplePanelActionTitle">
            <h1>{embeddable.getTitle()}</h1>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <h3 data-test-subj="samplePanelActionBody">This is a sample action</h3>
        </EuiFlyoutBody>
      </React.Fragment>,
      {
        'data-test-subj': 'samplePanelActionFlyout',
      }
    );
  };
}

const action = new SamplePanelAction();
setup.registerAction(action);
setup.attachAction(CONTEXT_MENU_TRIGGER, action.id);
