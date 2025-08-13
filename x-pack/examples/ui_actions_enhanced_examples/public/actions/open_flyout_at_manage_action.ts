/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement as h } from 'react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import {
  SAMPLE_APP2_CLICK_TRIGGER,
  SampleApp2ClickContext,
  sampleApp2ClickContext,
} from '../triggers';

export const createOpenFlyoutAtManageAction = ({ start }: { start: any }) => ({
  id: 'SINGLE_ELEMENT_EXAMPLE_OPEN_FLYOUT_AT_MANAGE',
  order: 1,
  getDisplayName: () => 'Manage drilldowns',
  getIconType: () => 'list',
  isCompatible: async ({ workpadId, elementId }: SampleApp2ClickContext) =>
    workpadId === '123' && elementId === '456',
  execute: async () => {
    const { core: coreStart, plugins: pluginsStart, self } = start();
    const handle = coreStart.overlays.openFlyout(
      toMountPoint(
        h(pluginsStart.uiActionsEnhanced.DrilldownManager, {
          onClose: () => handle.close(),
          initialRoute: '/manage',
          dynamicActionManager: self.managerWithoutEmbeddableSingleButton,
          triggers: [SAMPLE_APP2_CLICK_TRIGGER],
          placeContext: { sampleApp2ClickContext },
        }),
        coreStart.rendering
      ),
      {
        ownFocus: true,
      }
    );
  },
});
