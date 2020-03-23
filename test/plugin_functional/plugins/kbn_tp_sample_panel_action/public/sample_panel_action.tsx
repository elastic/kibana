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
import { npStart, npSetup } from 'ui/new_platform';

import { CONTEXT_MENU_TRIGGER, IEmbeddable } from '../../../../../src/plugins/embeddable/public';
import { createAction, ActionType } from '../../../../../src/plugins/ui_actions/public';
import { toMountPoint } from '../../../../../src/plugins/kibana_react/public';

// Casting to ActionType is a hack - in a real situation use
// declare module and add this id to ActionContextMapping.
export const SAMPLE_PANEL_ACTION = 'SAMPLE_PANEL_ACTION' as ActionType;

export interface SamplePanelActionContext {
  embeddable: IEmbeddable;
}

function createSamplePanelAction() {
  return createAction<typeof SAMPLE_PANEL_ACTION>({
    type: SAMPLE_PANEL_ACTION,
    getDisplayName: () => 'Sample Panel Action',
    execute: async ({ embeddable }: SamplePanelActionContext) => {
      if (!embeddable) {
        return;
      }
      npStart.core.overlays.openFlyout(
        toMountPoint(
          <React.Fragment>
            <EuiFlyoutHeader>
              <EuiTitle size="m" data-test-subj="samplePanelActionTitle">
                <h1>{embeddable.getTitle()}</h1>
              </EuiTitle>
            </EuiFlyoutHeader>
            <EuiFlyoutBody>
              <h3 data-test-subj="samplePanelActionBody">This is a sample action</h3>
            </EuiFlyoutBody>
          </React.Fragment>
        ),
        {
          'data-test-subj': 'samplePanelActionFlyout',
        }
      );
    },
  });
}

const action = createSamplePanelAction();
npSetup.plugins.uiActions.registerAction(action);
npSetup.plugins.uiActions.attachAction(CONTEXT_MENU_TRIGGER, action);
