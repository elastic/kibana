/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import {
  attachWithFlightFromBridge,
  POC_ATTACH_ATTACHMENT,
  POC_ATTACH_FLIGHT_ICON,
} from './attachment_coordinator/coordinator_bridge';

export const AGENT_FIRST_ATTACH_MENU_ITEM_ID = 'agentFirstAttachTo';

export const registerAgentFirstAttachAppMenuItem = (core: CoreStart): (() => void) => {
  return core.chrome.registerAppMenuStaticItem({
    id: AGENT_FIRST_ATTACH_MENU_ITEM_ID,
    label: i18n.translate('xpack.agentBuilder.agentFirst.attachToMenuItem', {
      defaultMessage: 'Attach to',
    }),
    iconType: 'paperClip',
    order: 50,
    testId: 'agentFirstAttachToButton',
    run: ({ triggerElement, returnFocus }) => {
      const sourceRect = triggerElement.getBoundingClientRect();

      void attachWithFlightFromBridge(POC_ATTACH_ATTACHMENT, {
        sourceRect,
        iconType: POC_ATTACH_FLIGHT_ICON,
      }).finally(() => {
        returnFocus();
      });
    },
  });
};
