/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement as h } from 'react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { SAMPLE_APP2_CLICK_TRIGGER, SampleApp2ClickContext } from '../triggers';

export const createOpenFlyoutAtCreateAction = ({ start }: { start: any }) => ({
  id: 'SINGLE_ELEMENT_EXAMPLE_OPEN_FLYOUT_AT_CREATE',
  order: 2,
  getDisplayName: () => 'Add drilldown now',
  getIconType: () => 'plusInCircle',
  isCompatible: async ({ workpadId, elementId }: SampleApp2ClickContext) =>
    workpadId === '123' && elementId === '456',
  execute: async () => {
    const { core: coreStart, plugins: pluginsStart, self } = start();
    const handle = coreStart.overlays.openFlyout(
      toMountPoint(
        h(pluginsStart.uiActionsEnhanced.DrilldownManager, {
          onClose: () => handle.close(),
          initialRoute: '/create',
          dynamicActionManager: self.managerWithoutEmbeddableSingleButton,
          triggers: [SAMPLE_APP2_CLICK_TRIGGER],
          placeContext: {},
        }),
        coreStart.rendering
      ),
      {
        ownFocus: true,
      }
    );
  },
});
