/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup } from '@kbn/core/public';
import { EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import React from 'react';

import { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { createAction } from '@kbn/ui-actions-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';

export const SAMPLE_PANEL_ACTION = 'samplePanelAction';

export interface SamplePanelActionContext {
  embeddable: DefaultEmbeddableApi;
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
      const coreStart = (await getStartServices())[0];
      const { overlays, ...startServices } = coreStart;
      const openFlyout = overlays.openFlyout;
      openFlyout(
        toMountPoint(
          <React.Fragment>
            <EuiFlyoutHeader>
              <EuiTitle size="m" data-test-subj="samplePanelActionTitle">
                <h1>{embeddable.panelTitle?.value}</h1>
              </EuiTitle>
            </EuiFlyoutHeader>
            <EuiFlyoutBody>
              <h3 data-test-subj="samplePanelActionBody">This is a sample action</h3>
            </EuiFlyoutBody>
          </React.Fragment>,
          startServices
        ),
        {
          'data-test-subj': 'samplePanelActionFlyout',
        }
      );
    },
  });
}
