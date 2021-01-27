/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CoreSetup } from 'kibana/public';
import { EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import React from 'react';

import { IEmbeddable } from '../../../../../src/plugins/embeddable/public';
import { createAction } from '../../../../../src/plugins/ui_actions/public';
import { toMountPoint } from '../../../../../src/plugins/kibana_react/public';

export const SAMPLE_PANEL_ACTION = 'samplePanelAction';

export interface SamplePanelActionContext {
  embeddable: IEmbeddable;
}

export function createSamplePanelAction(getStartServices: CoreSetup['getStartServices']) {
  return createAction<SamplePanelActionContext>({
    id: SAMPLE_PANEL_ACTION,
    type: SAMPLE_PANEL_ACTION,
    getDisplayName: () => 'Sample Panel Action',
    execute: async ({ embeddable }: SamplePanelActionContext) => {
      if (!embeddable) {
        return;
      }
      const openFlyout = (await getStartServices())[0].overlays.openFlyout;
      openFlyout(
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
